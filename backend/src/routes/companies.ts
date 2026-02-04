import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = Router();

// バリデーションスキーマ

// 企業一覧取得クエリ
const companyListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional(),
  industry: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// 企業作成・更新スキーマ
const companySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  nameKana: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().max(500).optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  industry: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional().default('ACTIVE'),
  remark: z.string().optional().nullable(),
});

// 拠点作成・更新スキーマ
const officeSchema = z.object({
  name: z.string().min(1).max(200),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  isHeadquarters: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
});

// 部署作成・更新スキーマ
const departmentSchema = z.object({
  officeId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  type: z.enum(['DIVISION', 'DEPARTMENT', 'SECTION', 'UNIT', 'OTHER']),
  name: z.string().min(1).max(200),
  sortOrder: z.number().int().optional().default(0),
});

// 担当窓口作成・更新スキーマ
const contactSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).max(100),
  nameKana: z.string().max(100).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  mobile: z.string().max(20).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  remark: z.string().optional().nullable(),
});

// 企業作成時のネストされたオブジェクト用スキーマ
const officeCreateSchema = z.object({
  name: z.string().min(1).max(200),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  isHeadquarters: z.boolean().optional().default(false),
});

const contactCreateSchema = z.object({
  name: z.string().min(1).max(100),
  nameKana: z.string().max(100).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
  mobile: z.string().max(20).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  remark: z.string().optional().nullable(),
});

// 企業作成スキーマ（ネストされたオブジェクトを含む）
const companyCreateSchema = companySchema.extend({
  offices: z.array(officeCreateSchema).optional(),
  contacts: z.array(contactCreateSchema).optional(),
});

/**
 * GET /api/companies
 * 企業一覧（検索、フィルタ、ページネーション）
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = companyListQuerySchema.parse(req.query);
    const { q, status, industry, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // 検索条件の構築
    const whereClause: Prisma.CompanyWhereInput = {};

    // 全文検索
    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { nameKana: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { industry: { contains: q, mode: 'insensitive' } },
      ];
    }

    // フィルタ
    if (status) {
      whereClause.status = status;
    }
    if (industry) {
      whereClause.industry = industry;
    }

    // データ取得
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              offices: true,
              departments: true,
              contacts: true,
              projects: true,
            },
          },
        },
      }),
      prisma.company.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/companies/:id
 * 企業詳細（拠点・部署・担当窓口・案件を含む）
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        offices: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        departments: {
          where: { parentId: null }, // ルート部署のみ取得
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            children: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                children: {
                  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                },
              },
            },
            office: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        projects: {
          orderBy: { createdAt: 'desc' },
          take: 10, // 最新10件のみ
        },
      },
    });

    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies
 * 企業新規登録（requireEditor）
 */
router.post('/', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = companyCreateSchema.parse(req.body);
    const { offices, contacts, ...companyData } = data;

    // 企業コードの重複チェック
    const existing = await prisma.company.findUnique({
      where: { code: companyData.code },
    });

    if (existing) {
      throw new AppError('DUPLICATE_CODE', '企業コードが既に使用されています', 400);
    }

    // トランザクションで企業と関連データを作成
    const company = await prisma.$transaction(async (tx) => {
      // 企業を作成
      const newCompany = await tx.company.create({
        data: companyData,
      });

      // 拠点を作成
      if (offices && offices.length > 0) {
        await tx.companyOffice.createMany({
          data: offices.map((office, index) => ({
            companyId: newCompany.id,
            name: office.name,
            postalCode: office.postalCode || null,
            address: office.address || null,
            phone: office.phone || null,
            isHeadquarters: office.isHeadquarters || false,
            sortOrder: index,
          })),
        });
      }

      // 担当窓口を作成
      if (contacts && contacts.length > 0) {
        await tx.companyContact.createMany({
          data: contacts.map((contact) => ({
            companyId: newCompany.id,
            name: contact.name,
            nameKana: contact.nameKana || null,
            title: contact.title || null,
            email: contact.email || null,
            phone: contact.phone || null,
            mobile: contact.mobile || null,
            isPrimary: contact.isPrimary || false,
            remark: contact.remark || null,
          })),
        });
      }

      // 作成した企業を関連データと共に取得
      return tx.company.findUnique({
        where: { id: newCompany.id },
        include: {
          offices: { orderBy: { sortOrder: 'asc' } },
          contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
          _count: {
            select: {
              offices: true,
              departments: true,
              contacts: true,
              projects: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/companies/:id
 * 企業更新（requireEditor）
 */
router.put('/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new AppError('BAD_REQUEST', '企業IDが必要です', 400);
    }
    const companyId = id; // Type narrowing: id is now string

    const data = companyCreateSchema.partial().parse(req.body);
    const { offices, contacts, ...companyData } = data;

    // 存在確認
    const existing = await prisma.company.findUnique({ where: { id: companyId } });
    if (!existing) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 企業コードの重複チェック（自分以外）
    if (companyData.code && companyData.code !== existing.code) {
      const duplicate = await prisma.company.findUnique({
        where: { code: companyData.code },
      });
      if (duplicate) {
        throw new AppError('DUPLICATE_CODE', '企業コードが既に使用されています', 400);
      }
    }

    // トランザクションで企業と関連データを更新
    const company = await prisma.$transaction(async (tx) => {
      // 企業を更新
      await tx.company.update({
        where: { id: companyId },
        data: companyData,
      });

      // 拠点を更新（配列が渡された場合のみ）
      if (offices !== undefined) {
        // 既存の拠点を削除
        await tx.companyOffice.deleteMany({
          where: { companyId },
        });

        // 新しい拠点を作成
        if (offices.length > 0) {
          await tx.companyOffice.createMany({
            data: offices.map((office, index) => ({
              companyId,
              name: office.name,
              postalCode: office.postalCode || null,
              address: office.address || null,
              phone: office.phone || null,
              isHeadquarters: office.isHeadquarters || false,
              sortOrder: index,
            })),
          });
        }
      }

      // 担当窓口を更新（配列が渡された場合のみ）
      if (contacts !== undefined) {
        // 既存の担当窓口を削除
        await tx.companyContact.deleteMany({
          where: { companyId },
        });

        // 新しい担当窓口を作成
        if (contacts.length > 0) {
          await tx.companyContact.createMany({
            data: contacts.map((contact) => ({
              companyId,
              name: contact.name,
              nameKana: contact.nameKana || null,
              title: contact.title || null,
              email: contact.email || null,
              phone: contact.phone || null,
              mobile: contact.mobile || null,
              isPrimary: contact.isPrimary || false,
              remark: contact.remark || null,
            })),
          });
        }
      }

      // 更新した企業を関連データと共に取得
      return tx.company.findUnique({
        where: { id: companyId },
        include: {
          offices: { orderBy: { sortOrder: 'asc' } },
          contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
          _count: {
            select: {
              offices: true,
              departments: true,
              contacts: true,
              projects: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/companies/:id
 * 企業削除（requireEditor）
 */
router.delete('/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // 存在確認
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    await prisma.company.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '企業を削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 拠点管理
// ============================================

/**
 * GET /api/companies/:companyId/offices
 * 拠点一覧
 */
router.get('/:companyId/offices', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    const offices = await prisma.companyOffice.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: offices,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies/:companyId/offices
 * 拠点追加
 */
router.post('/:companyId/offices', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;
    const data = officeSchema.parse(req.body);

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    const office = await prisma.companyOffice.create({
      data: {
        companyId: companyId!,
        name: data.name,
        postalCode: data.postalCode ?? null,
        address: data.address ?? null,
        phone: data.phone ?? null,
        isHeadquarters: data.isHeadquarters ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: office,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/companies/:companyId/offices/:id
 * 拠点更新
 */
router.put('/:companyId/offices/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId, id } = req.params;
    const data = officeSchema.partial().parse(req.body);

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 拠点の存在確認
    const existing = await prisma.companyOffice.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', '拠点が見つかりません', 404);
    }

    const office = await prisma.companyOffice.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            departments: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: office,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/companies/:companyId/offices/:id
 * 拠点削除
 */
router.delete('/:companyId/offices/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId, id } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 拠点の存在確認
    const existing = await prisma.companyOffice.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', '拠点が見つかりません', 404);
    }

    await prisma.companyOffice.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '拠点を削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 部署管理
// ============================================

/**
 * GET /api/companies/:companyId/departments
 * 部署一覧（階層構造）
 */
router.get('/:companyId/departments', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    const departments = await prisma.companyDepartment.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            contacts: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/companies/:companyId/departments/tree
 * 部署ツリー取得（階層構造）
 */
router.get('/:companyId/departments/tree', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // ルート部署のみ取得（再帰的にchildrenを含む）
    const departments = await prisma.companyDepartment.findMany({
      where: { companyId, parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            children: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                children: {
                  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                },
              },
            },
          },
        },
        _count: {
          select: {
            contacts: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies/:companyId/departments
 * 部署追加
 */
router.post('/:companyId/departments', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;
    const data = departmentSchema.parse(req.body);

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 親部署の存在確認
    if (data.parentId) {
      const parent = await prisma.companyDepartment.findFirst({
        where: { id: data.parentId, companyId },
      });
      if (!parent) {
        throw new AppError('NOT_FOUND', '親部署が見つかりません', 404);
      }
    }

    // 拠点の存在確認
    if (data.officeId) {
      const office = await prisma.companyOffice.findFirst({
        where: { id: data.officeId, companyId },
      });
      if (!office) {
        throw new AppError('NOT_FOUND', '拠点が見つかりません', 404);
      }
    }

    const department = await prisma.companyDepartment.create({
      data: {
        companyId: companyId!,
        officeId: data.officeId ?? null,
        parentId: data.parentId ?? null,
        type: data.type,
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            contacts: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/companies/:companyId/departments/:id
 * 部署更新
 */
router.put('/:companyId/departments/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId, id } = req.params;
    const data = departmentSchema.partial().parse(req.body);

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 部署の存在確認
    const existing = await prisma.companyDepartment.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', '部署が見つかりません', 404);
    }

    // 親部署の存在確認と循環参照チェック
    if (data.parentId) {
      if (data.parentId === id) {
        throw new AppError('INVALID_PARENT', '自分自身を親部署に設定することはできません', 400);
      }
      const parent = await prisma.companyDepartment.findFirst({
        where: { id: data.parentId, companyId },
      });
      if (!parent) {
        throw new AppError('NOT_FOUND', '親部署が見つかりません', 404);
      }
    }

    // 拠点の存在確認
    if (data.officeId) {
      const office = await prisma.companyOffice.findFirst({
        where: { id: data.officeId, companyId },
      });
      if (!office) {
        throw new AppError('NOT_FOUND', '拠点が見つかりません', 404);
      }
    }

    const department = await prisma.companyDepartment.update({
      where: { id },
      data,
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            contacts: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/companies/:companyId/departments/:id
 * 部署削除
 */
router.delete('/:companyId/departments/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId, id } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 部署の存在確認
    const existing = await prisma.companyDepartment.findFirst({
      where: { id, companyId },
      include: {
        children: true,
      },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', '部署が見つかりません', 404);
    }

    // 子部署がある場合は削除不可
    if (existing.children.length > 0) {
      throw new AppError('HAS_CHILDREN', '子部署が存在するため削除できません', 400);
    }

    await prisma.companyDepartment.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '部署を削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 担当窓口管理
// ============================================

/**
 * GET /api/companies/:companyId/contacts
 * 担当窓口一覧
 */
router.get('/:companyId/contacts', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    const contacts = await prisma.companyContact.findMany({
      where: { companyId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      include: {
        department: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/companies/:companyId/contacts
 * 担当窓口追加
 */
router.post('/:companyId/contacts', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId } = req.params;
    const data = contactSchema.parse(req.body);

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 部署の存在確認
    if (data.departmentId) {
      const department = await prisma.companyDepartment.findFirst({
        where: { id: data.departmentId, companyId },
      });
      if (!department) {
        throw new AppError('NOT_FOUND', '部署が見つかりません', 404);
      }
    }

    // メールアドレスの正規化
    const contactData = {
      ...data,
      email: data.email === '' ? null : data.email,
    };

    const contact = await prisma.companyContact.create({
      data: {
        companyId: companyId!,
        departmentId: contactData.departmentId ?? null,
        name: contactData.name,
        nameKana: contactData.nameKana ?? null,
        title: contactData.title ?? null,
        email: contactData.email ?? null,
        phone: contactData.phone ?? null,
        mobile: contactData.mobile ?? null,
        isPrimary: contactData.isPrimary ?? false,
        remark: contactData.remark ?? null,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/companies/:companyId/contacts/:id
 * 担当窓口更新
 */
router.put('/:companyId/contacts/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId, id } = req.params;
    const data = contactSchema.partial().parse(req.body);

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 担当窓口の存在確認
    const existing = await prisma.companyContact.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', '担当窓口が見つかりません', 404);
    }

    // 部署の存在確認
    if (data.departmentId) {
      const department = await prisma.companyDepartment.findFirst({
        where: { id: data.departmentId, companyId },
      });
      if (!department) {
        throw new AppError('NOT_FOUND', '部署が見つかりません', 404);
      }
    }

    // メールアドレスの正規化
    const updateData = {
      ...data,
      email: data.email === '' ? null : data.email,
    };

    const contact = await prisma.companyContact.update({
      where: { id },
      data: updateData,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/companies/:companyId/contacts/:id
 * 担当窓口削除
 */
router.delete('/:companyId/contacts/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { companyId, id } = req.params;

    // 企業の存在確認
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new AppError('NOT_FOUND', '企業が見つかりません', 404);
    }

    // 担当窓口の存在確認
    const existing = await prisma.companyContact.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      throw new AppError('NOT_FOUND', '担当窓口が見つかりません', 404);
    }

    await prisma.companyContact.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '担当窓口を削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

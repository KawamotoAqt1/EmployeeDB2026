import { Router, Request, Response, NextFunction } from 'express';
import { Prisma, ProjectStatus, ContractTypeProject, AssignmentStatus } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireEditor } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = Router();

// ============================================
// バリデーションスキーマ
// ============================================

// 案件一覧クエリスキーマ
const projectListQuerySchema = z.object({
  keyword: z.string().optional(),
  companyId: z.string().uuid().optional(),
  status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  contractType: z.enum(['DISPATCH', 'SES', 'CONTRACT']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// 案件作成スキーマ
// Note: budget と unitPrice は Prisma では Decimal(15,2) だが、Zod では number で受け取る。
// JavaScript の number (IEEE 754 倍精度浮動小数点) は約 15-17 桁の精度があり、
// Decimal(15,2) の最大値 9,999,999,999,999.99 を正確に表現可能。
// 通常の予算・単価計算では精度問題は発生しない。
// 極端に大きな金額や精密な金融計算が必要な場合は decimal.js 等の導入を検討。
const projectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1, '案件名は必須です').max(200),
  description: z.string().optional().nullable(),
  companyId: z.string().uuid('有効な企業IDを指定してください'),
  departmentId: z.string().uuid().optional().nullable(),
  contractType: z.enum(['DISPATCH', 'SES', 'CONTRACT']),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional().default('PROPOSAL'),
  location: z.string().max(200).optional().nullable(),
  remark: z.string().optional().nullable(),
});

// 案件更新スキーマ
const projectUpdateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1, '案件名は必須です').max(200).optional(),
  description: z.string().optional().nullable(),
  companyId: z.string().uuid('有効な企業IDを指定してください').optional(),
  departmentId: z.string().uuid().optional().nullable(),
  contractType: z.enum(['DISPATCH', 'SES', 'CONTRACT']).optional(),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  location: z.string().max(200).optional().nullable(),
  remark: z.string().optional().nullable(),
});

// 参画追加スキーマ
// Note: unitPrice の Decimal 精度については projectSchema のコメント参照
const assignmentSchema = z.object({
  employeeId: z.string().uuid('有効な社員IDを指定してください'),
  role: z.string().max(100).optional().nullable(),
  assignmentStartDate: z.string(),
  assignmentEndDate: z.string().optional().nullable(),
  workloadPercentage: z.number().int().min(0).max(100).optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  billingType: z.enum(['HOURLY', 'DAILY', 'MONTHLY', 'FIXED']).optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).optional().default('SCHEDULED'),
  remark: z.string().optional().nullable(),
});

// 参画更新スキーマ
const assignmentUpdateSchema = z.object({
  role: z.string().max(100).optional().nullable(),
  assignmentStartDate: z.string().optional(),
  assignmentEndDate: z.string().optional().nullable(),
  workloadPercentage: z.number().int().min(0).max(100).optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  billingType: z.enum(['HOURLY', 'DAILY', 'MONTHLY', 'FIXED']).optional().nullable(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).optional(),
  remark: z.string().optional().nullable(),
});

// ============================================
// 案件管理エンドポイント
// ============================================

/**
 * GET /api/projects
 * 案件一覧取得（ページネーション、検索、フィルタ）
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = projectListQuerySchema.parse(req.query);
    const { keyword, companyId, status, contractType, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // 検索条件の構築
    const whereClause: Prisma.ProjectWhereInput = {};

    // キーワード検索
    if (keyword) {
      whereClause.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { code: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
        { location: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // フィルタ
    if (companyId) {
      whereClause.companyId = companyId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (contractType) {
      whereClause.contractType = contractType;
    }

    // データ取得
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          company: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          assignments: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: projects,
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
 * GET /api/projects/:id
 * 案件詳細取得（企業情報・参画社員を含む）
 */
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        company: true,
        department: true,
        assignments: {
          include: {
            employee: {
              select: {
                id: true,
                employeeNumber: true,
                fullName: true,
                email: true,
                department: true,
                position: true,
                status: true,
              },
            },
          },
          orderBy: {
            assignmentStartDate: 'desc',
          },
        },
      },
    });

    if (!project) {
      throw new AppError('NOT_FOUND', '案件が見つかりません', 404);
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects
 * 案件新規登録（requireEditor）
 */
router.post('/', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = projectSchema.parse(req.body);

    // 契約期間の妥当性チェック
    if (data.contractStartDate && data.contractEndDate) {
      const startDate = new Date(data.contractStartDate);
      const endDate = new Date(data.contractEndDate);
      if (startDate > endDate) {
        throw new AppError('BAD_REQUEST', '契約終了日は契約開始日以降である必要があります', 400);
      }
    }

    // 企業の存在確認
    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
    });

    if (!company) {
      throw new AppError('BAD_REQUEST', '指定された企業が見つかりません', 400);
    }

    // 部署の存在確認（指定されている場合）
    if (data.departmentId) {
      const department = await prisma.companyDepartment.findUnique({
        where: { id: data.departmentId },
      });

      if (!department) {
        throw new AppError('BAD_REQUEST', '指定された部署が見つかりません', 400);
      }
    }

    // 日付フィールドの変換
    const projectData: Prisma.ProjectCreateInput = {
      code: data.code,
      name: data.name,
      description: data.description,
      contractType: data.contractType as ContractTypeProject,
      contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      budget: data.budget,
      unitPrice: data.unitPrice,
      status: data.status as ProjectStatus,
      location: data.location,
      remark: data.remark,
      company: {
        connect: { id: data.companyId },
      },
      ...(data.departmentId && {
        department: {
          connect: { id: data.departmentId },
        },
      }),
    };

    const project = await prisma.project.create({
      data: projectData,
      include: {
        company: true,
        department: true,
        assignments: true,
      },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:id
 * 案件更新（requireEditor）
 */
router.put('/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = projectUpdateSchema.parse(req.body);

    // 存在確認
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', '案件が見つかりません', 404);
    }

    // 企業の存在確認（変更する場合）
    if (data.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
      });

      if (!company) {
        throw new AppError('BAD_REQUEST', '指定された企業が見つかりません', 400);
      }
    }

    // 日付フィールドの変換
    const updateData: Prisma.ProjectUpdateInput = {
      ...(data.code !== undefined && { code: data.code }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.contractType !== undefined && { contractType: data.contractType as ContractTypeProject }),
      ...(data.contractStartDate !== undefined && {
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
      }),
      ...(data.contractEndDate !== undefined && {
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      }),
      ...(data.deliveryDate !== undefined && {
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      }),
      ...(data.budget !== undefined && { budget: data.budget }),
      ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
      ...(data.status !== undefined && { status: data.status as ProjectStatus }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.remark !== undefined && { remark: data.remark }),
      ...(data.companyId !== undefined && {
        company: { connect: { id: data.companyId } },
      }),
      ...(data.departmentId !== undefined && {
        department: data.departmentId ? { connect: { id: data.departmentId } } : { disconnect: true },
      }),
    };

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        company: true,
        department: true,
        assignments: true,
      },
    });

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:id
 * 案件削除（requireEditor）
 */
router.delete('/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // 存在確認
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', '案件が見つかりません', 404);
    }

    await prisma.project.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '案件を削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// 案件参画管理エンドポイント
// ============================================

/**
 * GET /api/projects/:projectId/assignments
 * 案件の参画社員一覧
 */
router.get('/:projectId/assignments', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;

    // 案件の存在確認
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('NOT_FOUND', '案件が見つかりません', 404);
    }

    const assignments = await prisma.projectAssignment.findMany({
      where: { projectId },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            fullNameKana: true,
            email: true,
            department: true,
            position: true,
            status: true,
          },
        },
      },
      orderBy: {
        assignmentStartDate: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/assignments
 * 社員を案件に参画させる
 */
router.post('/:projectId/assignments', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;
    const data = assignmentSchema.parse(req.body);

    // 参画期間の妥当性チェック
    if (data.assignmentEndDate) {
      const startDate = new Date(data.assignmentStartDate);
      const endDate = new Date(data.assignmentEndDate);
      if (startDate > endDate) {
        throw new AppError('BAD_REQUEST', '参画終了日は参画開始日以降である必要があります', 400);
      }
    }

    // 案件の存在確認
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError('NOT_FOUND', '案件が見つかりません', 404);
    }

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) {
      throw new AppError('BAD_REQUEST', '指定された社員が見つかりません', 400);
    }

    // 参画期間が案件期間内かチェック
    const assignmentStart = new Date(data.assignmentStartDate);
    const assignmentEnd = data.assignmentEndDate ? new Date(data.assignmentEndDate) : null;

    if (project.contractStartDate && assignmentStart < project.contractStartDate) {
      throw new AppError('BAD_REQUEST', '参画開始日は案件期間内である必要があります', 400);
    }

    if (project.contractEndDate && assignmentEnd && assignmentEnd > project.contractEndDate) {
      throw new AppError('BAD_REQUEST', '参画終了日は案件期間内である必要があります', 400);
    }

    // 参画データ作成
    const assignment = await prisma.projectAssignment.create({
      data: {
        projectId: projectId!,
        employeeId: data.employeeId,
        role: data.role,
        assignmentStartDate: assignmentStart,
        assignmentEndDate: assignmentEnd,
        workloadPercentage: data.workloadPercentage,
        unitPrice: data.unitPrice,
        billingType: data.billingType,
        status: data.status as AssignmentStatus,
        remark: data.remark,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            email: true,
            department: true,
            position: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/projects/:projectId/assignments/:id
 * 参画情報更新（終了日設定等）
 */
router.put('/:projectId/assignments/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, id } = req.params;
    const data = assignmentUpdateSchema.parse(req.body);

    // 参画の存在確認
    const existing = await prisma.projectAssignment.findFirst({
      where: { id, projectId },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', '参画情報が見つかりません', 404);
    }

    // 更新データ構築
    const updateData: Prisma.ProjectAssignmentUpdateInput = {
      ...(data.role !== undefined && { role: data.role }),
      ...(data.assignmentStartDate !== undefined && {
        assignmentStartDate: new Date(data.assignmentStartDate),
      }),
      ...(data.assignmentEndDate !== undefined && {
        assignmentEndDate: data.assignmentEndDate ? new Date(data.assignmentEndDate) : null,
      }),
      ...(data.workloadPercentage !== undefined && { workloadPercentage: data.workloadPercentage }),
      ...(data.unitPrice !== undefined && { unitPrice: data.unitPrice }),
      ...(data.billingType !== undefined && { billingType: data.billingType }),
      ...(data.status !== undefined && { status: data.status as AssignmentStatus }),
      ...(data.remark !== undefined && { remark: data.remark }),
    };

    const assignment = await prisma.projectAssignment.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            email: true,
            department: true,
            position: true,
            status: true,
          },
        },
        project: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/projects/:projectId/assignments/:id
 * 参画解除
 */
router.delete('/:projectId/assignments/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, id } = req.params;

    // 参画の存在確認
    const existing = await prisma.projectAssignment.findFirst({
      where: { id, projectId },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', '参画情報が見つかりません', 404);
    }

    await prisma.projectAssignment.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '参画を解除しました' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

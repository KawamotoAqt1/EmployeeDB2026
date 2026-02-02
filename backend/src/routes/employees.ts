import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, SkillLevel } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// 画像アップロード設定
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `employee-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('許可されていないファイル形式です。JPEG, PNG, GIF, WebPのみ使用できます。'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// バリデーションスキーマ

// 一覧取得クエリ
const employeeListQuerySchema = z.object({
  q: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'PENDING']).optional(),
  tags: z.string().optional(), // カンマ区切りのタグID
  tagOperator: z.enum(['AND', 'OR']).optional().default('AND'),
  matchType: z.enum(['partial', 'prefix']).optional().default('partial'),
  level: z.string().optional(), // 最低スキルレベル
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('employeeNumber'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

// 社員作成・更新スキーマ
const employeeSchema = z.object({
  employeeNumber: z.string().min(1).max(20),
  employeeUniqueNumber: z.string().max(50).optional().nullable(),
  fullName: z.string().min(1).max(100),
  fullNameKana: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  contractType: z.enum(['FULL_TIME', 'CONTRACT', 'PART_TIME', 'TEMPORARY', 'INTERN', 'OUTSOURCE']).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
  residence: z.string().max(100).optional().nullable(),
  station: z.string().max(100).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'PENDING']).optional().default('ACTIVE'),
  remark: z.string().optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
});

// スキル追加スキーマ
const addSkillSchema = z.object({
  tagId: z.string().uuid(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional().default('BEGINNER'),
});

// スキルレベルの順序
const skillLevelOrder: Record<SkillLevel, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

/**
 * GET /api/employees
 * 社員一覧（検索、フィルタ、ページネーション）
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = employeeListQuerySchema.parse(req.query);
    const { q, department, position, location, status, tags, tagOperator, matchType, level, page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // 検索条件の構築
    const whereClause: Prisma.EmployeeWhereInput = {};

    // 全フィールド検索（部分一致または先頭一致）
    if (q) {
      const searchMode = matchType === 'prefix' ? 'startsWith' : 'contains';
      whereClause.OR = [
        { fullName: { [searchMode]: q, mode: 'insensitive' } },
        { fullNameKana: { [searchMode]: q, mode: 'insensitive' } },
        { employeeNumber: { [searchMode]: q, mode: 'insensitive' } },
        { email: { [searchMode]: q, mode: 'insensitive' } },
        { department: { [searchMode]: q, mode: 'insensitive' } },
        { position: { [searchMode]: q, mode: 'insensitive' } },
        { location: { [searchMode]: q, mode: 'insensitive' } },
        { country: { [searchMode]: q, mode: 'insensitive' } },
        { residence: { [searchMode]: q, mode: 'insensitive' } },
        { station: { [searchMode]: q, mode: 'insensitive' } },
        { remark: { [searchMode]: q, mode: 'insensitive' } },
      ];
    }

    // フィルタ
    if (department) {
      whereClause.department = department;
    }
    if (position) {
      whereClause.position = position;
    }
    if (location) {
      whereClause.location = location;
    }
    if (status) {
      whereClause.status = status;
    }

    // タグフィルタ
    if (tags) {
      const tagIdList = tags.split(',').filter((id) => id.trim());

      if (tagIdList.length > 0) {
        // 最低スキルレベルのフィルタ
        const minLevel = level as SkillLevel | undefined;
        const minLevelOrder = minLevel ? skillLevelOrder[minLevel] : 0;

        if (tagOperator === 'AND') {
          // すべてのタグを持つ社員を検索
          whereClause.AND = tagIdList.map((tagId) => ({
            skills: {
              some: {
                tagId,
                ...(minLevelOrder > 0 && {
                  level: {
                    in: Object.entries(skillLevelOrder)
                      .filter(([_, order]) => order >= minLevelOrder)
                      .map(([lvl, _]) => lvl as SkillLevel),
                  },
                }),
              },
            },
          }));
        } else {
          // いずれかのタグを持つ社員を検索
          whereClause.skills = {
            some: {
              tagId: { in: tagIdList },
              ...(minLevelOrder > 0 && {
                level: {
                  in: Object.entries(skillLevelOrder)
                    .filter(([_, order]) => order >= minLevelOrder)
                    .map(([lvl, _]) => lvl as SkillLevel),
                },
              }),
            },
          };
        }
      }
    }

    // データ取得
    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          skills: {
            include: {
              tag: {
                include: {
                  category: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.employee.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: employees,
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
 * GET /api/employees/:id
 * 社員詳細（スキル情報含む）
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            tag: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/employees
 * 社員登録（admin/editor）
 */
router.post('/', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = employeeSchema.parse(req.body);

    // 日付フィールドの変換
    const employeeData: Prisma.EmployeeCreateInput = {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
      contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
    };

    const employee = await prisma.employee.create({
      data: employeeData,
      include: {
        skills: {
          include: {
            tag: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/employees/:id
 * 社員更新（admin/editor）
 */
router.put('/:id', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = employeeSchema.partial().parse(req.body);

    // 存在確認
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    // 日付フィールドの変換
    const updateData: Prisma.EmployeeUpdateInput = {
      ...data,
      ...(data.birthDate !== undefined && {
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
      }),
      ...(data.hireDate !== undefined && {
        hireDate: data.hireDate ? new Date(data.hireDate) : null,
      }),
      ...(data.contractEndDate !== undefined && {
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
      }),
    };

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        skills: {
          include: {
            tag: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/employees/:id
 * 社員削除（admin/editor）
 */
router.delete('/:id', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const id = req.params.id;

    // 存在確認
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    await prisma.employee.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: '社員を削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/employees/:id/skills
 * スキル追加（admin/editor）
 */
router.post('/:id/skills', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new AppError('BAD_REQUEST', '社員IDが必要です', 400);
    }

    const { tagId, level } = addSkillSchema.parse(req.body);

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    // タグの存在確認
    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    if (!tag) {
      throw new AppError('NOT_FOUND', 'タグが見つかりません', 404);
    }

    // スキル追加（既存の場合は更新）
    const skill = await prisma.employeeSkill.upsert({
      where: {
        employeeId_tagId: {
          employeeId: id,
          tagId,
        },
      },
      update: { level },
      create: {
        employeeId: id,
        tagId,
        level,
      },
      include: {
        tag: {
          include: {
            category: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: skill,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/employees/:id/skills/:skillId
 * スキル削除（admin/editor）
 */
router.delete('/:id/skills/:skillId', requireAuth, requireEditor, async (req, res, next) => {
  try {
    const id = req.params.id;
    const skillId = req.params.skillId;

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    // スキルの存在確認
    const skill = await prisma.employeeSkill.findFirst({
      where: {
        id: skillId,
        employeeId: id,
      },
    });

    if (!skill) {
      throw new AppError('NOT_FOUND', 'スキルが見つかりません', 404);
    }

    await prisma.employeeSkill.delete({ where: { id: skillId } });

    res.status(200).json({
      success: true,
      data: { message: 'スキルを削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/employees/:id/image
 * 社員写真アップロード（admin）
 */
router.post('/:id/image', requireAuth, requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const file = req.file;

    if (!file) {
      throw new AppError('BAD_REQUEST', '画像ファイルが必要です', 400);
    }

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      // アップロードされたファイルを削除
      fs.unlinkSync(file.path);
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    // 古い画像があれば削除
    if (employee.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '../../', employee.photoUrl.replace(/^\//, ''));
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // 画像URLを更新
    const photoUrl = `/uploads/${file.filename}`;
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: { photoUrl },
      include: {
        skills: {
          include: {
            tag: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/employees/:id/image
 * 社員写真削除（admin）
 */
router.delete('/:id/image', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;

    // 社員の存在確認
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      throw new AppError('NOT_FOUND', '社員が見つかりません', 404);
    }

    // 画像ファイルを削除
    if (employee.photoUrl) {
      const photoPath = path.join(__dirname, '../../', employee.photoUrl.replace(/^\//, ''));
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    // 画像URLをクリア
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: { photoUrl: null },
      include: {
        skills: {
          include: {
            tag: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

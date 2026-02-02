import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// バリデーションスキーマ

// カテゴリ作成・更新スキーマ
const categorySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});

// タグ作成・更新スキーマ
const tagSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().optional().default(0),
});

/**
 * GET /api/tags/categories
 * カテゴリ一覧（タグ含む）
 */
router.get('/categories', requireAuth, async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await prisma.tagCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        tags: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            tags: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            },
          },
        },
      },
    });

    // 親カテゴリのみを返す（子は入れ子で含まれる）
    const rootCategories = categories.filter((cat) => cat.parentId === null);

    res.status(200).json({
      success: true,
      data: rootCategories,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tags/categories
 * カテゴリ追加（admin）
 */
router.post('/categories', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = categorySchema.parse(req.body);

    // 親カテゴリの存在確認
    if (data.parentId) {
      const parent = await prisma.tagCategory.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new AppError('NOT_FOUND', '親カテゴリが見つかりません', 404);
      }
    }

    const category = await prisma.tagCategory.create({
      data,
      include: {
        tags: true,
        children: true,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tags/categories/:id
 * カテゴリ更新（admin）
 */
router.put('/categories/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = categorySchema.partial().parse(req.body);

    // 存在確認
    const existing = await prisma.tagCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'カテゴリが見つかりません', 404);
    }

    // 親カテゴリの存在確認
    if (data.parentId) {
      // 自分自身を親に設定することはできない
      if (data.parentId === id) {
        throw new AppError('INVALID_PARENT', '自分自身を親カテゴリに設定することはできません', 400);
      }
      const parent = await prisma.tagCategory.findUnique({ where: { id: data.parentId } });
      if (!parent) {
        throw new AppError('NOT_FOUND', '親カテゴリが見つかりません', 404);
      }
    }

    const category = await prisma.tagCategory.update({
      where: { id },
      data,
      include: {
        tags: true,
        children: true,
      },
    });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tags/categories/:id
 * カテゴリ削除（admin）
 */
router.delete('/categories/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // 存在確認
    const existing = await prisma.tagCategory.findUnique({
      where: { id },
      include: {
        tags: true,
        children: true,
      },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'カテゴリが見つかりません', 404);
    }

    // 子カテゴリがある場合は削除不可
    if (existing.children.length > 0) {
      throw new AppError('HAS_CHILDREN', '子カテゴリが存在するため削除できません', 400);
    }

    // タグがある場合は削除不可（カスケード削除は危険なため明示的にエラー）
    if (existing.tags.length > 0) {
      throw new AppError('HAS_TAGS', 'タグが存在するため削除できません', 400);
    }

    await prisma.tagCategory.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: 'カテゴリを削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tags
 * タグ一覧取得
 */
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { categoryId, limit = 1000 } = req.query;

    const tags = await prisma.tag.findMany({
      where: categoryId ? { categoryId: categoryId as string } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: true,
      },
      take: Number(limit),
    });

    res.status(200).json({
      success: true,
      data: tags,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tags
 * タグ追加（admin）
 */
router.post('/', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = tagSchema.parse(req.body);

    // カテゴリの存在確認
    const category = await prisma.tagCategory.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      throw new AppError('NOT_FOUND', 'カテゴリが見つかりません', 404);
    }

    const tag = await prisma.tag.create({
      data,
      include: {
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tags/:id
 * タグ更新（admin）
 */
router.put('/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = tagSchema.partial().parse(req.body);

    // 存在確認
    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NOT_FOUND', 'タグが見つかりません', 404);
    }

    // カテゴリの存在確認
    if (data.categoryId) {
      const category = await prisma.tagCategory.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        throw new AppError('NOT_FOUND', 'カテゴリが見つかりません', 404);
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data,
      include: {
        category: true,
      },
    });

    res.status(200).json({
      success: true,
      data: tag,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tags/:id
 * タグ削除（admin）
 */
router.delete('/:id', requireAuth, requireEditor, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // 存在確認
    const existing = await prisma.tag.findUnique({
      where: { id },
      include: {
        employeeSkills: true,
      },
    });

    if (!existing) {
      throw new AppError('NOT_FOUND', 'タグが見つかりません', 404);
    }

    // 社員スキルに使用されている場合は警告
    if (existing.employeeSkills.length > 0) {
      throw new AppError(
        'TAG_IN_USE',
        `このタグは${existing.employeeSkills.length}人の社員に使用されています。削除すると関連するスキルも削除されます。`,
        400
      );
    }

    await prisma.tag.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { message: 'タグを削除しました' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

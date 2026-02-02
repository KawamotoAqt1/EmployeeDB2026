import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// バリデーションスキーマ
const userListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

const createUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).default('VIEWER'),
});

const updateUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください').optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
});

/**
 * GET /api/users
 * ユーザー一覧取得（admin）
 */
router.get('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = userListQuerySchema.parse(req.query);
    const { page, limit, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    res.status(200).json({
      success: true,
      data: users,
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
 * GET /api/users/:id
 * ユーザー詳細取得（admin）
 */
router.get('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'ユーザーが見つかりません', 404);
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users
 * ユーザー作成（admin）
 */
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createUserSchema.parse(req.body);
    const { email, password, role } = data;

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('DUPLICATE_EMAIL', 'このメールアドレスは既に使用されています', 400);
    }

    // パスワードのハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role as UserRole,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:id
 * ユーザー更新（admin）
 */
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    // 存在確認
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('NOT_FOUND', 'ユーザーが見つかりません', 404);
    }

    // メールアドレス変更時の重複チェック
    if (data.email && data.email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (duplicateUser) {
        throw new AppError('DUPLICATE_EMAIL', 'このメールアドレスは既に使用されています', 400);
      }
    }

    // 更新データの準備
    const updateData: any = {};
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // ユーザー更新
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/users/:id
 * ユーザー削除（admin）
 */
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // 自分自身は削除できない
    if (req.user?.id === id) {
      throw new AppError('BAD_REQUEST', '自分自身のアカウントは削除できません', 400);
    }

    // 存在確認
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('NOT_FOUND', 'ユーザーが見つかりません', 404);
    }

    // ユーザー削除
    await prisma.user.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'ユーザーを削除しました',
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

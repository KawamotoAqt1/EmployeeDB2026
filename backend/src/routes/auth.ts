import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAuth, generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../lib/prisma';

const router = Router();

// バリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string().min(6, '新しいパスワードは6文字以上で入力してください'),
});

/**
 * POST /api/auth/login
 * ログイン
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // バリデーション
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません', 401);
    }

    // パスワード検証（bcrypt の形式不正時は 500 ではなく 401 で返す）
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.passwordHash);
    } catch (bcryptError) {
      console.error('Login: bcrypt.compare failed (invalid hash?)', bcryptError);
      throw new AppError('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません', 401);
    }

    if (!isValidPassword) {
      throw new AppError('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません', 401);
    }

    // JWTトークン生成
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('[auth/login] Error:', error);
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * ログアウト
 */
router.post('/logout', requireAuth, (_req: Request, res: Response): void => {
  // JWTはステートレスなので、サーバー側での無効化は行わない
  // クライアント側でトークンを削除することでログアウトを実現
  res.status(200).json({
    success: true,
    data: {
      message: 'ログアウトしました',
    },
  });
});

/**
 * GET /api/auth/me
 * 現在のユーザー情報取得
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', '認証が必要です', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'ユーザーが見つかりません', 404);
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
 * POST /api/auth/change-password
 * パスワード変更
 */
router.post('/change-password', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('UNAUTHORIZED', '認証が必要です', 401);
    }

    // バリデーション
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'ユーザーが見つかりません', 404);
    }

    // 現在のパスワードを検証
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    } catch (bcryptError) {
      console.error('ChangePassword: bcrypt.compare failed', bcryptError);
      throw new AppError('INVALID_PASSWORD', '現在のパスワードが正しくありません', 400);
    }

    if (!isValidPassword) {
      throw new AppError('INVALID_PASSWORD', '現在のパスワードが正しくありません', 400);
    }

    // 新しいパスワードをハッシュ化して更新
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.status(200).json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    console.error('[auth/change-password] Error:', error);
    next(error);
  }
});

export default router;

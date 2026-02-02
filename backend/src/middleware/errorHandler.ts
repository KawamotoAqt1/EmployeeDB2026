import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// カスタムエラークラス
export class AppError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * グローバルエラーハンドラー
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  // Zodバリデーションエラー
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'バリデーションエラー',
        details: formattedErrors,
      },
    });
    return;
  }

  // カスタムAppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Prismaエラー
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        const target = err.meta?.target as string[] | undefined;
        const field = target?.join(', ') || 'フィールド';
        res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_ENTRY',
            message: `${field}は既に使用されています`,
          },
        });
        return;
      }
      case 'P2025': {
        // Record not found
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'レコードが見つかりません',
          },
        });
        return;
      }
      case 'P2003': {
        // Foreign key constraint failed
        res.status(400).json({
          success: false,
          error: {
            code: 'FOREIGN_KEY_ERROR',
            message: '関連するレコードが存在しません',
          },
        });
        return;
      }
      case 'P2014': {
        // Relation violation
        res.status(400).json({
          success: false,
          error: {
            code: 'RELATION_ERROR',
            message: '関連データの整合性エラー',
          },
        });
        return;
      }
      default:
        console.error('Prisma error:', err.code, err.message);
        res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'データベースエラーが発生しました',
          },
        });
        return;
    }
  }

  // Prisma初期化エラー
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('Prisma initialization error:', err);
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'データベースに接続できません',
      },
    });
    return;
  }

  // Prisma検証エラー
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'データの形式が正しくありません',
      },
    });
    return;
  }

  // 予期しないエラー
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDevelopment ? err.message : 'サーバーエラーが発生しました',
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

/**
 * 404ハンドラー
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'リソースが見つかりません',
    },
  });
};

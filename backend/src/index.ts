import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// ルーター
import authRouter from './routes/auth';
import employeesRouter from './routes/employees';
import tagsRouter from './routes/tags';
import importRouter from './routes/import';
import usersRouter from './routes/users';

// ミドルウェア
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// 環境変数の読み込み
dotenv.config();

// Prismaクライアントの初期化
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Expressアプリケーションの初期化
const app: Express = express();
const PORT = process.env.PORT ?? 3001;

// ============================================
// Middleware
// ============================================

// CORS設定
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// JSONパーサー
app.use(express.json({ limit: '10mb' }));

// URLエンコードパーサー
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静的ファイル配信（アップロード画像）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// リクエストログ（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Health Check & Basic Routes
// ============================================

/**
 * ヘルスチェックエンドポイント
 */
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // データベース接続確認
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV ?? 'development',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * API情報エンドポイント
 */
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Employee Database API',
    version: '1.0.0',
    description: 'REST API for Employee Database Management System',
    endpoints: {
      health: 'GET /health',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
      employees: {
        list: 'GET /api/employees',
        get: 'GET /api/employees/:id',
        create: 'POST /api/employees',
        update: 'PUT /api/employees/:id',
        delete: 'DELETE /api/employees/:id',
        addSkill: 'POST /api/employees/:id/skills',
        removeSkill: 'DELETE /api/employees/:id/skills/:skillId',
      },
      tags: {
        categories: 'GET /api/tags/categories',
        createCategory: 'POST /api/tags/categories',
        updateCategory: 'PUT /api/tags/categories/:id',
        deleteCategory: 'DELETE /api/tags/categories/:id',
        createTag: 'POST /api/tags',
        updateTag: 'PUT /api/tags/:id',
        deleteTag: 'DELETE /api/tags/:id',
      },
      import: {
        preview: 'POST /api/import/preview',
        employees: 'POST /api/import/employees',
      },
      stats: 'GET /api/stats',
    },
  });
});

// ============================================
// API Routes
// ============================================

// 認証ルーター
app.use('/api/auth', authRouter);

// ユーザールーター
app.use('/api/users', usersRouter);

// 社員ルーター
app.use('/api/employees', employeesRouter);

// タグルーター
app.use('/api/tags', tagsRouter);

// インポートルーター
app.use('/api/import', importRouter);

// ============================================
// Legacy Routes (for backward compatibility)
// ============================================

/**
 * タグカテゴリ一覧取得（レガシー）
 */
app.get('/api/tag-categories', async (_req: Request, res: Response) => {
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
    console.error('Error fetching tag categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tag categories',
    });
  }
});

/**
 * 統計情報取得
 */
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalEmployees,
      activeEmployees,
      departmentStats,
      skillStats,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.employee.groupBy({
        by: ['department'],
        _count: { id: true },
        where: { department: { not: null } },
      }),
      prisma.employeeSkill.groupBy({
        by: ['tagId'],
        _count: { id: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        departmentDistribution: departmentStats.map((d) => ({
          department: d.department,
          count: d._count.id,
        })),
        topSkillsCount: skillStats.length,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

// ============================================
// Error Handling
// ============================================

// 404ハンドラー
app.use(notFoundHandler);

// グローバルエラーハンドラー
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

async function startServer(): Promise<void> {
  try {
    // データベース接続確認
    await prisma.$connect();
    console.log('Database connected successfully');

    // サーバー起動
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`Employee Database API Server`);
      console.log('========================================');
      console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
      console.log(`Server running on: http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API info: http://localhost:${PORT}/api`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// サーバー起動
startServer();

export default app;

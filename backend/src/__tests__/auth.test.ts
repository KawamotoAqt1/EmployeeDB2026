import request from 'supertest';
import express, { Express } from 'express';
import { testUsers, getAdminToken, getMockPrisma } from './setup';

// Expressアプリとルーターのセットアップ
let app: Express;
let mockPrisma: any;

// auth.tsのルーターを動的にインポートするためのモック設定
jest.mock('../middleware/auth', () => {
  const jwt = require('jsonwebtoken');

  return {
    requireAuth: async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '認証が必要です' },
        });
      }

      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, role: true },
        });

        if (!user) {
          return res.status(401).json({
            success: false,
            error: { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' },
          });
        }

        req.user = user;
        next();
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: { code: 'TOKEN_EXPIRED', message: 'トークンの有効期限が切れています' },
          });
        }
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: '無効なトークンです' },
        });
      }
    },
    generateToken: (user: { id: string; email: string; role: string }) => {
      return jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    },
  };
});

// ルーターをインポート
import authRouter from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';

beforeEach(() => {
  // アプリケーションの初期化
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use(errorHandler);

  // モックPrismaを取得
  mockPrisma = getMockPrisma();
});

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('正常系: 有効な認証情報でログインしトークンを返却する', async () => {
      // Prismaモックの設定
      mockPrisma.user.findUnique.mockResolvedValue(testUsers.admin);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email', 'admin@example.com');
      expect(response.body.data.user).toHaveProperty('role', 'ADMIN');
    });

    it('異常系: 存在しないメールアドレスでログイン失敗', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('異常系: 不正なパスワードでログイン失敗', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUsers.admin);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('異常系: メールアドレス形式が無効', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: パスワードが空', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me', () => {
    it('正常系: 認証済みユーザーの情報を取得', async () => {
      const adminToken = getAdminToken();

      // findUniqueが2回呼ばれる（authミドルウェアとmeエンドポイント）
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          role: testUsers.admin.role,
        })
        .mockResolvedValueOnce({
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          role: testUsers.admin.role,
          createdAt: testUsers.admin.createdAt,
        });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testUsers.admin.id);
      expect(response.body.data).toHaveProperty('email', testUsers.admin.email);
      expect(response.body.data).toHaveProperty('role', testUsers.admin.role);
    });

    it('異常系: 認証ヘッダーなしでアクセス', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('異常系: 無効なトークンでアクセス', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('異常系: Bearer形式でないトークン', async () => {
      const adminToken = getAdminToken();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', adminToken);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('異常系: ユーザーがDBに存在しない', async () => {
      const adminToken = getAdminToken();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('正常系: 認証済みユーザーがログアウト', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('ログアウトしました');
    });

    it('異常系: 未認証でログアウト試行', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});

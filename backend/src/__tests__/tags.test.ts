import request from 'supertest';
import express, { Express } from 'express';
import { testUsers, testTagCategories, testTags, getAdminToken, getUserToken, getMockPrisma } from './setup';

let app: Express;
let mockPrisma: any;

// authミドルウェアのモック
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
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: '無効なトークンです' },
        });
      }
    },
    requireAdmin: (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '認証が必要です' },
        });
      }

      if (req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '管理者権限が必要です' },
        });
      }

      next();
    },
  };
});

import tagsRouter from '../routes/tags';
import { errorHandler } from '../middleware/errorHandler';

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/tags', tagsRouter);
  app.use(errorHandler);

  mockPrisma = getMockPrisma();
});

describe('Tags API', () => {
  describe('GET /api/tags/categories', () => {
    it('正常系: カテゴリ一覧を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findMany.mockResolvedValue([
        testTagCategories.category1,
        testTagCategories.category2,
      ]);

      const response = await request(app)
        .get('/api/tags/categories')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('正常系: 一般ユーザーもカテゴリ一覧を取得可能', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      mockPrisma.tagCategory.findMany.mockResolvedValue([
        testTagCategories.category1,
        testTagCategories.category2,
      ]);

      const response = await request(app)
        .get('/api/tags/categories')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('異常系: 未認証でアクセス', async () => {
      const response = await request(app).get('/api/tags/categories');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tags/categories', () => {
    it('正常系: 管理者がカテゴリを作成', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const newCategory = {
        code: 'SOFT',
        name: 'ソフトスキル',
        sortOrder: 3,
      };

      mockPrisma.tagCategory.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440022',
        ...newCategory,
        parentId: null,
        tags: [],
        children: [],
      });

      const response = await request(app)
        .post('/api/tags/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('code', 'SOFT');
      expect(response.body.data).toHaveProperty('name', 'ソフトスキル');
    });

    it('正常系: 子カテゴリを作成', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(testTagCategories.category1);

      const newCategory = {
        code: 'FRONTEND',
        name: 'フロントエンド',
        parentId: testTagCategories.category1.id,
        sortOrder: 1,
      };

      mockPrisma.tagCategory.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440023',
        ...newCategory,
        tags: [],
        children: [],
      });

      const response = await request(app)
        .post('/api/tags/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCategory);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('parentId', testTagCategories.category1.id);
    });

    it('異常系: 一般ユーザーはカテゴリ作成不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const response = await request(app)
        .post('/api/tags/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          code: 'SOFT',
          name: 'ソフトスキル',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('異常系: 存在しない親カテゴリを指定', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/tags/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'FRONTEND',
          name: 'フロントエンド',
          parentId: '550e8400-e29b-41d4-a716-446655449997',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('異常系: バリデーションエラー（コードなし）', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const response = await request(app)
        .post('/api/tags/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'ソフトスキル',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/tags/categories/:id', () => {
    it('正常系: 管理者がカテゴリを更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(testTagCategories.category1);
      mockPrisma.tagCategory.update.mockResolvedValue({
        ...testTagCategories.category1,
        name: '技術スキル（更新）',
      });

      const response = await request(app)
        .put(`/api/tags/categories/${testTagCategories.category1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '技術スキル（更新）' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('技術スキル（更新）');
    });

    it('異常系: 自分自身を親カテゴリに設定', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(testTagCategories.category1);

      const response = await request(app)
        .put(`/api/tags/categories/${testTagCategories.category1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ parentId: testTagCategories.category1.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PARENT');
    });
  });

  describe('DELETE /api/tags/categories/:id', () => {
    it('正常系: 管理者が空のカテゴリを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue({
        ...testTagCategories.category1,
        tags: [],
        children: [],
      });
      mockPrisma.tagCategory.delete.mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/tags/categories/${testTagCategories.category1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('異常系: タグが存在するカテゴリを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue({
        ...testTagCategories.category1,
        tags: [testTags.tag1],
        children: [],
      });

      const response = await request(app)
        .delete(`/api/tags/categories/${testTagCategories.category1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('HAS_TAGS');
    });

    it('異常系: 子カテゴリが存在するカテゴリを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue({
        ...testTagCategories.category1,
        tags: [],
        children: [{ id: '550e8400-e29b-41d4-a716-446655440024' }],
      });

      const response = await request(app)
        .delete(`/api/tags/categories/${testTagCategories.category1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('HAS_CHILDREN');
    });

    it('異常系: 存在しないカテゴリを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/tags/categories/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/tags', () => {
    it('正常系: 管理者がタグを作成', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(testTagCategories.category1);

      const newTag = {
        categoryId: testTagCategories.category1.id,
        name: 'React',
        sortOrder: 3,
      };

      mockPrisma.tag.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440032',
        ...newTag,
        category: testTagCategories.category1,
      });

      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTag);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', 'React');
      expect(response.body.data).toHaveProperty('categoryId', testTagCategories.category1.id);
    });

    it('異常系: 存在しないカテゴリにタグを作成', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tagCategory.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          categoryId: '550e8400-e29b-41d4-a716-446655449996',
          name: 'React',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('異常系: 一般ユーザーはタグ作成不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          categoryId: testTagCategories.category1.id,
          name: 'React',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tags/:id', () => {
    it('正常系: 管理者がタグを更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tag.findUnique.mockResolvedValue(testTags.tag1);
      mockPrisma.tag.update.mockResolvedValue({
        ...testTags.tag1,
        name: 'JavaScript (ES6+)',
      });

      const response = await request(app)
        .put(`/api/tags/${testTags.tag1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'JavaScript (ES6+)' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('JavaScript (ES6+)');
    });

    it('異常系: 存在しないタグを更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tag.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/tags/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Tag' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('正常系: 管理者が未使用タグを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tag.findUnique.mockResolvedValue({
        ...testTags.tag1,
        employeeSkills: [],
      });
      mockPrisma.tag.delete.mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/tags/${testTags.tag1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('異常系: 使用中のタグを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tag.findUnique.mockResolvedValue({
        ...testTags.tag1,
        employeeSkills: [{ id: 'skill-1' }, { id: 'skill-2' }],
      });

      const response = await request(app)
        .delete(`/api/tags/${testTags.tag1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TAG_IN_USE');
    });

    it('異常系: 存在しないタグを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.tag.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/tags/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('異常系: 一般ユーザーはタグ削除不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const response = await request(app)
        .delete(`/api/tags/${testTags.tag1.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });
});

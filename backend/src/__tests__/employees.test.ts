import request from 'supertest';
import express, { Express } from 'express';
import { testUsers, testEmployees, testTags, getAdminToken, getUserToken, getMockPrisma } from './setup';

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

import employeesRouter from '../routes/employees';
import { errorHandler } from '../middleware/errorHandler';

beforeEach(() => {
  app = express();
  app.use(express.json());
  app.use('/api/employees', employeesRouter);
  app.use(errorHandler);

  mockPrisma = getMockPrisma();
});

describe('Employees API', () => {
  describe('GET /api/employees', () => {
    it('正常系: 社員一覧を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findMany.mockResolvedValue([testEmployees.employee1, testEmployees.employee2]);
      mockPrisma.employee.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
      expect(response.body.pagination).toHaveProperty('page', 1);
    });

    it('正常系: 検索クエリで社員を検索', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findMany.mockResolvedValue([testEmployees.employee1]);
      mockPrisma.employee.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/employees')
        .query({ q: '山田' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('正常系: 部署でフィルタリング', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findMany.mockResolvedValue([testEmployees.employee1]);
      mockPrisma.employee.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/employees')
        .query({ department: '開発部' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('正常系: ステータスでフィルタリング', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findMany.mockResolvedValue([testEmployees.employee1, testEmployees.employee2]);
      mockPrisma.employee.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/employees')
        .query({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('正常系: ページネーション', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findMany.mockResolvedValue([testEmployees.employee1]);
      mockPrisma.employee.count.mockResolvedValue(50);

      const response = await request(app)
        .get('/api/employees')
        .query({ page: 2, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.totalPages).toBe(5);
    });

    it('異常系: 未認証でアクセス', async () => {
      const response = await request(app).get('/api/employees');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('正常系: 社員詳細を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);

      const response = await request(app)
        .get(`/api/employees/${testEmployees.employee1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', testEmployees.employee1.id);
      expect(response.body.data).toHaveProperty('fullName', '山田太郎');
    });

    it('異常系: 存在しないIDで取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/employees', () => {
    it('正常系: 管理者が社員を登録', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const newEmployee = {
        employeeNumber: 'EMP003',
        fullName: '佐藤次郎',
        department: 'マーケティング部',
        status: 'ACTIVE',
      };

      mockPrisma.employee.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440012',
        ...newEmployee,
        skills: [],
      });

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEmployee);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('employeeNumber', 'EMP003');
      expect(response.body.data).toHaveProperty('fullName', '佐藤次郎');
    });

    it('異常系: 一般ユーザーは社員登録不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const newEmployee = {
        employeeNumber: 'EMP003',
        fullName: '佐藤次郎',
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newEmployee);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('異常系: バリデーションエラー（社員番号なし）', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const invalidEmployee = {
        fullName: '佐藤次郎',
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmployee);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('異常系: バリデーションエラー（氏名なし）', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const invalidEmployee = {
        employeeNumber: 'EMP003',
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEmployee);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('正常系: 管理者が社員情報を更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);

      const updatedData = {
        department: '営業部',
        position: 'シニアエンジニア',
      };

      mockPrisma.employee.update.mockResolvedValue({
        ...testEmployees.employee1,
        ...updatedData,
      });

      const response = await request(app)
        .put(`/api/employees/${testEmployees.employee1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('department', '営業部');
      expect(response.body.data).toHaveProperty('position', 'シニアエンジニア');
    });

    it('異常系: 存在しない社員を更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ department: '営業部' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('異常系: 一般ユーザーは更新不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const response = await request(app)
        .put(`/api/employees/${testEmployees.employee1.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ department: '営業部' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('正常系: 管理者が社員を削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);
      mockPrisma.employee.delete.mockResolvedValue(testEmployees.employee1);

      const response = await request(app)
        .delete(`/api/employees/${testEmployees.employee1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('社員を削除しました');
    });

    it('異常系: 存在しない社員を削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/employees/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('異常系: 一般ユーザーは削除不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const response = await request(app)
        .delete(`/api/employees/${testEmployees.employee1.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/employees/:id/skills', () => {
    it('正常系: 管理者がスキルを追加', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);
      mockPrisma.tag.findUnique.mockResolvedValue(testTags.tag1);
      mockPrisma.employeeSkill.upsert.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440050',
        employeeId: testEmployees.employee1.id,
        tagId: testTags.tag1.id,
        level: 'INTERMEDIATE',
        tag: testTags.tag1,
      });

      const response = await request(app)
        .post(`/api/employees/${testEmployees.employee1.id}/skills`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tagId: testTags.tag1.id,
          level: 'INTERMEDIATE',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tagId', testTags.tag1.id);
    });

    it('異常系: 存在しないタグでスキル追加', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);
      mockPrisma.tag.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/employees/${testEmployees.employee1.id}/skills`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tagId: '550e8400-e29b-41d4-a716-446655449999',
          level: 'INTERMEDIATE',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/employees/:id/skills/:skillId', () => {
    it('正常系: 管理者がスキルを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);
      mockPrisma.employeeSkill.findFirst.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440051',
        employeeId: testEmployees.employee1.id,
        tagId: testTags.tag1.id,
        level: 'INTERMEDIATE',
      });
      mockPrisma.employeeSkill.delete.mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/employees/${testEmployees.employee1.id}/skills/550e8400-e29b-41d4-a716-446655440051`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('異常系: 存在しないスキルを削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.employee.findUnique.mockResolvedValue(testEmployees.employee1);
      mockPrisma.employeeSkill.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/employees/${testEmployees.employee1.id}/skills/550e8400-e29b-41d4-a716-446655449998`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});

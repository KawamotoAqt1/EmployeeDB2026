import request from 'supertest';
import express, { Express } from 'express';
import { testUsers, getAdminToken, getUserToken, getMockPrisma } from '../../__tests__/setup';

let app: Express;
let mockPrisma: any;

// authミドルウェアのモック
jest.mock('../../middleware/auth', () => {
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
    requireEditor: (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: '認証が必要です' },
        });
      }

      if (req.user.role !== 'ADMIN' && req.user.role !== 'EDITOR') {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: '編集権限が必要です' },
        });
      }

      next();
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

import companiesRouter from '../companies';
import { errorHandler } from '../../middleware/errorHandler';

// テストデータ
const testCompanies = {
  company1: {
    id: '550e8400-e29b-41d4-a716-446655440100',
    code: 'COMP001',
    name: '株式会社テスト企業A',
    nameKana: 'カブシキガイシャテストキギョウエー',
    postalCode: '100-0001',
    address: '東京都千代田区千代田1-1-1',
    phone: '03-1234-5678',
    website: 'https://example-a.com',
    industry: 'IT',
    status: 'ACTIVE',
    remark: 'テスト企業A',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  company2: {
    id: '550e8400-e29b-41d4-a716-446655440101',
    code: 'COMP002',
    name: '株式会社テスト企業B',
    nameKana: 'カブシキガイシャテストキギョウビー',
    postalCode: '150-0001',
    address: '東京都渋谷区渋谷1-1-1',
    phone: '03-9876-5432',
    website: 'https://example-b.com',
    industry: '製造業',
    status: 'ACTIVE',
    remark: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const testOffices = {
  office1: {
    id: '550e8400-e29b-41d4-a716-446655440200',
    companyId: testCompanies.company1.id,
    name: '本社',
    postalCode: '100-0001',
    address: '東京都千代田区千代田1-1-1',
    phone: '03-1234-5678',
    isHeadquarters: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  office2: {
    id: '550e8400-e29b-41d4-a716-446655440201',
    companyId: testCompanies.company1.id,
    name: '大阪支社',
    postalCode: '530-0001',
    address: '大阪府大阪市北区梅田1-1-1',
    phone: '06-1234-5678',
    isHeadquarters: false,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const testDepartments = {
  department1: {
    id: '550e8400-e29b-41d4-a716-446655440300',
    companyId: testCompanies.company1.id,
    officeId: testOffices.office1.id,
    parentId: null,
    type: 'DIVISION',
    name: '開発事業部',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  department2: {
    id: '550e8400-e29b-41d4-a716-446655440301',
    companyId: testCompanies.company1.id,
    officeId: testOffices.office1.id,
    parentId: '550e8400-e29b-41d4-a716-446655440300',
    type: 'DEPARTMENT',
    name: 'システム開発部',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

const testContacts = {
  contact1: {
    id: '550e8400-e29b-41d4-a716-446655440400',
    companyId: testCompanies.company1.id,
    departmentId: testDepartments.department1.id,
    name: '山田太郎',
    nameKana: 'ヤマダタロウ',
    title: '部長',
    email: 'yamada@example-a.com',
    phone: '03-1234-5678',
    mobile: '090-1234-5678',
    isPrimary: true,
    remark: 'メイン担当者',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

beforeEach(() => {
  // モック設定
  const originalMock = jest.requireMock('@prisma/client');
  mockPrisma = {
    ...getMockPrisma(),
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    companyOffice: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    companyDepartment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    companyContact: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  // PrismaClientのモックを更新
  originalMock.PrismaClient = jest.fn(() => mockPrisma);

  app = express();
  app.use(express.json());
  app.use('/api/companies', companiesRouter);
  app.use(errorHandler);
});

describe('Companies API', () => {
  describe('GET /api/companies', () => {
    it('正常系: 企業一覧を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findMany.mockResolvedValue([testCompanies.company1, testCompanies.company2]);
      mockPrisma.company.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toHaveProperty('total', 2);
    });

    it('正常系: 企業名で検索', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findMany.mockResolvedValue([testCompanies.company1]);
      mockPrisma.company.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/companies')
        .query({ q: 'テスト企業A' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('正常系: ステータスでフィルタリング', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findMany.mockResolvedValue([testCompanies.company1]);
      mockPrisma.company.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/companies')
        .query({ status: 'ACTIVE' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('異常系: 未認証でアクセス', async () => {
      const response = await request(app).get('/api/companies');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/companies/:id', () => {
    it('正常系: 企業詳細を取得（関連データ含む）', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue({
        ...testCompanies.company1,
        offices: [testOffices.office1, testOffices.office2],
        departments: [testDepartments.department1],
        contacts: [testContacts.contact1],
        projects: [],
      });

      const response = await request(app)
        .get(`/api/companies/${testCompanies.company1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('offices');
      expect(response.body.data).toHaveProperty('departments');
      expect(response.body.data).toHaveProperty('contacts');
    });

    it('異常系: 存在しない企業を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/companies/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/companies', () => {
    it('正常系: 編集者が企業を登録', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const newCompany = {
        code: 'COMP003',
        name: '株式会社新規企業',
        status: 'ACTIVE',
      };

      mockPrisma.company.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440102',
        ...newCompany,
        nameKana: null,
        postalCode: null,
        address: null,
        phone: null,
        website: null,
        industry: null,
        remark: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCompany);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('code', 'COMP003');
    });

    it('異常系: 一般ユーザーは企業登録不可', async () => {
      const userToken = getUserToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.user.id,
        email: testUsers.user.email,
        role: testUsers.user.role,
      });

      const newCompany = {
        code: 'COMP003',
        name: '株式会社新規企業',
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newCompany);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('異常系: バリデーションエラー（企業コードなし）', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const invalidCompany = {
        name: '株式会社新規企業',
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCompany);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('異常系: バリデーションエラー（企業名なし）', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const invalidCompany = {
        code: 'COMP003',
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCompany);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('異常系: メール形式が不正', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      const invalidCompany = {
        code: 'COMP003',
        name: '株式会社新規企業',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidCompany);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('正常系: 編集者が企業情報を更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);

      const updateData = {
        phone: '03-9999-9999',
        website: 'https://new-example.com',
      };

      mockPrisma.company.update.mockResolvedValue({
        ...testCompanies.company1,
        ...updateData,
      });

      const response = await request(app)
        .put(`/api/companies/${testCompanies.company1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('phone', '03-9999-9999');
    });

    it('異常系: 存在しない企業を更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/companies/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '03-9999-9999' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('正常系: 編集者が企業を削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.company.delete.mockResolvedValue(testCompanies.company1);

      const response = await request(app)
        .delete(`/api/companies/${testCompanies.company1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('異常系: 存在しない企業を削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/companies/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  // 拠点管理のテスト
  describe('GET /api/companies/:companyId/offices', () => {
    it('正常系: 拠点一覧を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.companyOffice.findMany.mockResolvedValue([testOffices.office1, testOffices.office2]);

      const response = await request(app)
        .get(`/api/companies/${testCompanies.company1.id}/offices`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/companies/:companyId/offices', () => {
    it('正常系: 拠点を追加', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);

      const newOffice = {
        name: '名古屋支社',
        address: '愛知県名古屋市中区栄1-1-1',
        isHeadquarters: false,
      };

      mockPrisma.companyOffice.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440202',
        companyId: testCompanies.company1.id,
        ...newOffice,
        postalCode: null,
        phone: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/companies/${testCompanies.company1.id}/offices`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newOffice);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', '名古屋支社');
    });
  });

  // 部署管理のテスト
  describe('GET /api/companies/:companyId/departments', () => {
    it('正常系: 部署一覧を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.companyDepartment.findMany.mockResolvedValue([
        testDepartments.department1,
        testDepartments.department2,
      ]);

      const response = await request(app)
        .get(`/api/companies/${testCompanies.company1.id}/departments`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/companies/:companyId/departments/tree', () => {
    it('正常系: 部署ツリーを取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.companyDepartment.findMany.mockResolvedValue([
        {
          ...testDepartments.department1,
          children: [testDepartments.department2],
        },
      ]);

      const response = await request(app)
        .get(`/api/companies/${testCompanies.company1.id}/departments/tree`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/companies/:companyId/departments', () => {
    it('正常系: 部署を追加', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);

      const newDepartment = {
        type: 'DEPARTMENT',
        name: '営業部',
        officeId: testOffices.office1.id,
      };

      mockPrisma.companyDepartment.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440302',
        companyId: testCompanies.company1.id,
        ...newDepartment,
        parentId: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/companies/${testCompanies.company1.id}/departments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDepartment);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', '営業部');
    });
  });

  // 担当窓口管理のテスト
  describe('GET /api/companies/:companyId/contacts', () => {
    it('正常系: 担当窓口一覧を取得', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.companyContact.findMany.mockResolvedValue([testContacts.contact1]);

      const response = await request(app)
        .get(`/api/companies/${testCompanies.company1.id}/contacts`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('POST /api/companies/:companyId/contacts', () => {
    it('正常系: 担当窓口を追加', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);

      const newContact = {
        name: '鈴木花子',
        email: 'suzuki@example-a.com',
        phone: '03-1234-5679',
        isPrimary: false,
      };

      mockPrisma.companyContact.create.mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440401',
        companyId: testCompanies.company1.id,
        ...newContact,
        nameKana: null,
        title: null,
        mobile: null,
        departmentId: null,
        remark: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post(`/api/companies/${testCompanies.company1.id}/contacts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newContact);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('name', '鈴木花子');
    });

    it('異常系: メール形式が不正', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);

      const invalidContact = {
        name: '鈴木花子',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post(`/api/companies/${testCompanies.company1.id}/contacts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidContact);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/companies/:companyId/contacts/:id', () => {
    it('正常系: 担当窓口を更新', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.companyContact.findUnique.mockResolvedValue(testContacts.contact1);

      const updateData = {
        title: '課長',
      };

      mockPrisma.companyContact.update.mockResolvedValue({
        ...testContacts.contact1,
        ...updateData,
      });

      const response = await request(app)
        .put(`/api/companies/${testCompanies.company1.id}/contacts/${testContacts.contact1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('title', '課長');
    });
  });

  describe('DELETE /api/companies/:companyId/contacts/:id', () => {
    it('正常系: 担当窓口を削除', async () => {
      const adminToken = getAdminToken();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: testUsers.admin.id,
        email: testUsers.admin.email,
        role: testUsers.admin.role,
      });

      mockPrisma.company.findUnique.mockResolvedValue(testCompanies.company1);
      mockPrisma.companyContact.findUnique.mockResolvedValue(testContacts.contact1);
      mockPrisma.companyContact.delete.mockResolvedValue(testContacts.contact1);

      const response = await request(app)
        .delete(`/api/companies/${testCompanies.company1.id}/contacts/${testContacts.contact1.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

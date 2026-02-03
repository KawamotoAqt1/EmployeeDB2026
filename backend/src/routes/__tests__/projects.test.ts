import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../../middleware/auth';
import projectsRouter from '../projects';
import employeesRouter from '../employees';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';

// モックを無効化して実際のPrismaClientを使用
jest.unmock('@prisma/client');

const prisma = new PrismaClient();

// テストアプリケーション作成
const createTestApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectsRouter);
  app.use('/api/employees', employeesRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

// テストユーザー
const adminUser = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  email: 'admin@test-projects.com',
  role: 'ADMIN' as const,
};

const editorUser = {
  id: '550e8400-e29b-41d4-a716-446655440002',
  email: 'editor@test-projects.com',
  role: 'EDITOR' as const,
};

const viewerUser = {
  id: '550e8400-e29b-41d4-a716-446655440003',
  email: 'viewer@test-projects.com',
  role: 'VIEWER' as const,
};

// トークン生成
let adminToken: string;
let editorToken: string;
let viewerToken: string;

// テストデータ
let testCompany: any;
let testEmployee: any;
let testProject: any;

describe('Projects API', () => {
  let app: Express;

  beforeAll(async () => {
    app = createTestApp();

    // トークン生成
    adminToken = generateToken(adminUser);
    editorToken = generateToken(editorUser);
    viewerToken = generateToken(viewerUser);

    // テストユーザー作成
    await prisma.user.upsert({
      where: { email: adminUser.email },
      update: {},
      create: {
        id: adminUser.id,
        email: adminUser.email,
        passwordHash: 'dummy',
        role: adminUser.role,
      },
    });

    await prisma.user.upsert({
      where: { email: editorUser.email },
      update: {},
      create: {
        id: editorUser.id,
        email: editorUser.email,
        passwordHash: 'dummy',
        role: editorUser.role,
      },
    });

    await prisma.user.upsert({
      where: { email: viewerUser.email },
      update: {},
      create: {
        id: viewerUser.id,
        email: viewerUser.email,
        passwordHash: 'dummy',
        role: viewerUser.role,
      },
    });

    // テスト企業作成
    testCompany = await prisma.company.create({
      data: {
        code: 'TEST-COMPANY',
        name: 'テスト企業',
        status: 'ACTIVE',
      },
    });

    // テスト社員作成
    testEmployee = await prisma.employee.create({
      data: {
        employeeNumber: 'EMP-TEST-001',
        fullName: 'テスト太郎',
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // クリーンアップ
    await prisma.projectAssignment.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.employee.deleteMany({ where: { employeeNumber: { startsWith: 'EMP-TEST' } } });
    await prisma.company.deleteMany({ where: { code: { startsWith: 'TEST-' } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: '@test-projects.com' } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // 各テスト前にプロジェクトをクリーンアップ
    await prisma.projectAssignment.deleteMany({});
    await prisma.project.deleteMany({});
  });

  // =====================================
  // 案件管理エンドポイント
  // =====================================

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      // テストデータ作成
      await prisma.project.createMany({
        data: [
          {
            code: 'PRJ-001',
            name: 'プロジェクトA',
            companyId: testCompany.id,
            contractType: 'SES',
            status: 'IN_PROGRESS',
            contractStartDate: new Date('2024-01-01'),
            contractEndDate: new Date('2024-12-31'),
          },
          {
            code: 'PRJ-002',
            name: 'プロジェクトB',
            companyId: testCompany.id,
            contractType: 'DISPATCH',
            status: 'PROPOSAL',
            contractStartDate: new Date('2024-06-01'),
          },
          {
            code: 'PRJ-003',
            name: '別プロジェクト',
            companyId: testCompany.id,
            contractType: 'CONTRACT',
            status: 'COMPLETED',
          },
        ],
      });
    });

    it('認証なしの場合は401エラー', async () => {
      const res = await request(app).get('/api/projects');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('案件一覧を取得できる', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
      });
    });

    it('キーワード検索ができる', async () => {
      const res = await request(app)
        .get('/api/projects')
        .query({ keyword: 'プロジェクトA' })
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('プロジェクトA');
    });

    it('企業IDでフィルタできる', async () => {
      const res = await request(app)
        .get(`/api/projects?companyId=${testCompany.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
    });

    it('ステータスでフィルタできる', async () => {
      const res = await request(app)
        .get('/api/projects?status=IN_PROGRESS')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('IN_PROGRESS');
    });

    it('契約形態でフィルタできる', async () => {
      const res = await request(app)
        .get('/api/projects?contractType=SES')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].contractType).toBe('SES');
    });

    it('ページネーションが機能する', async () => {
      const res = await request(app)
        .get('/api/projects?page=1&limit=2')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-DETAIL',
          name: '詳細テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
        },
      });
    });

    it('案件詳細を取得できる（企業情報を含む）', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: testProject.id,
        name: '詳細テストプロジェクト',
        code: 'PRJ-DETAIL',
      });
      expect(res.body.data.company).toBeDefined();
      expect(res.body.data.company.name).toBe('テスト企業');
      expect(res.body.data.assignments).toBeDefined();
    });

    it('存在しない案件IDの場合は404エラー', async () => {
      const res = await request(app)
        .get('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/projects', () => {
    const validProjectData = {
      code: 'PRJ-NEW',
      name: '新規プロジェクト',
      companyId: '',
      contractType: 'SES',
      status: 'PROPOSAL',
      contractStartDate: '2024-04-01',
      contractEndDate: '2024-12-31',
      budget: 10000000,
      unitPrice: 800000,
    };

    beforeEach(() => {
      validProjectData.companyId = testCompany.id;
    });

    it('Editor権限で案件を作成できる', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${editorToken}`)
        .send(validProjectData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        code: 'PRJ-NEW',
        name: '新規プロジェクト',
        contractType: 'SES',
      });
    });

    it('Admin権限で案件を作成できる', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...validProjectData, code: 'PRJ-ADMIN' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('Viewer権限では作成できない（403エラー）', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(validProjectData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('案件名が必須', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ ...validProjectData, name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('契約終了日が開始日より前の場合はエラー', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          ...validProjectData,
          contractStartDate: '2024-12-31',
          contractEndDate: '2024-01-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('終了日');
    });

    it('存在しない企業IDの場合はエラー', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          ...validProjectData,
          companyId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-UPDATE',
          name: '更新テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
        },
      });
    });

    it('Editor権限で案件を更新できる', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          name: '更新後プロジェクト',
          status: 'COMPLETED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('更新後プロジェクト');
      expect(res.body.data.status).toBe('COMPLETED');
    });

    it('Viewer権限では更新できない', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: '変更' });

      expect(res.status).toBe(403);
    });

    it('存在しない案件IDの場合は404エラー', async () => {
      const res = await request(app)
        .put('/api/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: '変更' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-DELETE',
          name: '削除テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'PROPOSAL',
        },
      });
    });

    it('Editor権限で案件を削除できる', async () => {
      const res = await request(app)
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 削除確認
      const deleted = await prisma.project.findUnique({
        where: { id: testProject.id },
      });
      expect(deleted).toBeNull();
    });

    it('Viewer権限では削除できない', async () => {
      const res = await request(app)
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =====================================
  // 案件参画管理エンドポイント
  // =====================================

  describe('GET /api/projects/:projectId/assignments', () => {
    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-ASSIGN',
          name: '参画テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
        },
      });

      // 参画データ作成
      await prisma.projectAssignment.create({
        data: {
          projectId: testProject.id,
          employeeId: testEmployee.id,
          role: 'プログラマー',
          assignmentStartDate: new Date('2024-01-01'),
          assignmentEndDate: new Date('2024-12-31'),
          unitPrice: 700000,
          status: 'IN_PROGRESS',
        },
      });
    });

    it('案件の参画社員一覧を取得できる', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/assignments`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        role: 'プログラマー',
        status: 'IN_PROGRESS',
      });
      expect(res.body.data[0].employee).toBeDefined();
      expect(res.body.data[0].employee.fullName).toBe('テスト太郎');
    });
  });

  describe('POST /api/projects/:projectId/assignments', () => {
    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-ADD-ASSIGN',
          name: '参画追加テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
          contractStartDate: new Date('2024-01-01'),
          contractEndDate: new Date('2024-12-31'),
        },
      });
    });

    it('社員を案件に参画させることができる', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/assignments`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          employeeId: testEmployee.id,
          role: 'リーダー',
          assignmentStartDate: '2024-02-01',
          assignmentEndDate: '2024-11-30',
          unitPrice: 850000,
          workloadPercentage: 100,
          status: 'SCHEDULED',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        role: 'リーダー',
        status: 'SCHEDULED',
      });
    });

    it('参画期間が案件期間外の場合はエラー', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/assignments`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          employeeId: testEmployee.id,
          assignmentStartDate: '2023-12-01', // 案件開始前
          assignmentEndDate: '2024-06-30',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('案件期間');
    });

    it('Viewer権限では参画登録できない', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/assignments`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          employeeId: testEmployee.id,
          assignmentStartDate: '2024-02-01',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/projects/:projectId/assignments/:id', () => {
    let assignment: any;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-UPD-ASSIGN',
          name: '参画更新テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
        },
      });

      assignment = await prisma.projectAssignment.create({
        data: {
          projectId: testProject.id,
          employeeId: testEmployee.id,
          assignmentStartDate: new Date('2024-01-01'),
          status: 'IN_PROGRESS',
        },
      });
    });

    it('参画情報を更新できる（終了日設定等）', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          assignmentEndDate: '2024-12-31',
          status: 'COMPLETED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });

  describe('DELETE /api/projects/:projectId/assignments/:id', () => {
    let assignment: any;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          code: 'PRJ-DEL-ASSIGN',
          name: '参画削除テストプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
        },
      });

      assignment = await prisma.projectAssignment.create({
        data: {
          projectId: testProject.id,
          employeeId: testEmployee.id,
          assignmentStartDate: new Date('2024-01-01'),
          status: 'SCHEDULED',
        },
      });
    });

    it('参画を解除できる', async () => {
      const res = await request(app)
        .delete(`/api/projects/${testProject.id}/assignments/${assignment.id}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // 削除確認
      const deleted = await prisma.projectAssignment.findUnique({
        where: { id: assignment.id },
      });
      expect(deleted).toBeNull();
    });
  });

  // =====================================
  // 社員の参画履歴エンドポイント
  // =====================================

  describe('GET /api/employees/:employeeId/assignments', () => {
    beforeEach(async () => {
      // 複数のプロジェクトと参画を作成
      const project1 = await prisma.project.create({
        data: {
          code: 'PRJ-HIST-1',
          name: '現在のプロジェクト',
          companyId: testCompany.id,
          contractType: 'SES',
          status: 'IN_PROGRESS',
        },
      });

      const project2 = await prisma.project.create({
        data: {
          code: 'PRJ-HIST-2',
          name: '過去のプロジェクト',
          companyId: testCompany.id,
          contractType: 'DISPATCH',
          status: 'COMPLETED',
        },
      });

      // 現在参画中
      await prisma.projectAssignment.create({
        data: {
          projectId: project1.id,
          employeeId: testEmployee.id,
          assignmentStartDate: new Date('2024-01-01'),
          status: 'IN_PROGRESS',
        },
      });

      // 過去の履歴
      await prisma.projectAssignment.create({
        data: {
          projectId: project2.id,
          employeeId: testEmployee.id,
          assignmentStartDate: new Date('2023-01-01'),
          assignmentEndDate: new Date('2023-12-31'),
          status: 'COMPLETED',
        },
      });
    });

    it('社員の参画履歴を取得できる（時系列順）', async () => {
      const res = await request(app)
        .get(`/api/employees/${testEmployee.id}/assignments`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);

      // 時系列順（降順）で取得されることを確認
      expect(res.body.data[0].status).toBe('IN_PROGRESS');
      expect(res.body.data[1].status).toBe('COMPLETED');

      // プロジェクト情報が含まれることを確認
      expect(res.body.data[0].project).toBeDefined();
      expect(res.body.data[0].project.name).toBe('現在のプロジェクト');
    });

    it('ステータスでフィルタできる', async () => {
      const res = await request(app)
        .get(`/api/employees/${testEmployee.id}/assignments?status=IN_PROGRESS`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('IN_PROGRESS');
    });
  });
});

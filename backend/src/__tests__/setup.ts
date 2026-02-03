import { PrismaClient, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// テスト用のモック設定
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    employeeSkill: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    tagCategory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
    UserRole: {
      ADMIN: 'ADMIN',
      USER: 'USER',
    },
    SkillLevel: {
      BEGINNER: 'BEGINNER',
      INTERMEDIATE: 'INTERMEDIATE',
      ADVANCED: 'ADVANCED',
      EXPERT: 'EXPERT',
    },
    Prisma: {
      PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
        code: string;
        meta?: Record<string, unknown>;
        constructor(message: string, { code, meta }: { code: string; meta?: Record<string, unknown> }) {
          super(message);
          this.code = code;
          this.meta = meta;
          this.name = 'PrismaClientKnownRequestError';
        }
      },
      PrismaClientInitializationError: class PrismaClientInitializationError extends Error {},
      PrismaClientValidationError: class PrismaClientValidationError extends Error {},
    },
  };
});

// 環境変数の設定
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

// テスト用のユーザーデータ（UUIDv4形式）
export const testUsers = {
  admin: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@example.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'ADMIN' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  user: {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'user@example.com',
    passwordHash: bcrypt.hashSync('user123', 10),
    role: 'USER' as UserRole,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// テスト用の社員データ（UUIDv4形式）
export const testEmployees = {
  employee1: {
    id: '550e8400-e29b-41d4-a716-446655440010',
    employeeNumber: 'EMP001',
    employeeUniqueNumber: 'UNIQUE001',
    fullName: '山田太郎',
    fullNameKana: 'ヤマダタロウ',
    email: 'yamada@example.com',
    birthDate: new Date('1990-01-15'),
    gender: 'MALE',
    contractType: 'FULL_TIME',
    department: '開発部',
    position: 'エンジニア',
    location: '東京',
    country: '日本',
    residence: '東京都渋谷区',
    station: '渋谷駅',
    hireDate: new Date('2020-04-01'),
    contractEndDate: null,
    status: 'ACTIVE',
    remark: null,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    skills: [],
  },
  employee2: {
    id: '550e8400-e29b-41d4-a716-446655440011',
    employeeNumber: 'EMP002',
    employeeUniqueNumber: 'UNIQUE002',
    fullName: '鈴木花子',
    fullNameKana: 'スズキハナコ',
    email: 'suzuki@example.com',
    birthDate: new Date('1992-05-20'),
    gender: 'FEMALE',
    contractType: 'FULL_TIME',
    department: '人事部',
    position: 'マネージャー',
    location: '大阪',
    country: '日本',
    residence: '大阪府大阪市',
    station: '梅田駅',
    hireDate: new Date('2018-10-01'),
    contractEndDate: null,
    status: 'ACTIVE',
    remark: null,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    skills: [],
  },
};

// テスト用のタグカテゴリデータ（UUIDv4形式）
export const testTagCategories = {
  category1: {
    id: '550e8400-e29b-41d4-a716-446655440020',
    code: 'TECH',
    name: '技術スキル',
    parentId: null,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    children: [],
  },
  category2: {
    id: '550e8400-e29b-41d4-a716-446655440021',
    code: 'LANG',
    name: '言語スキル',
    parentId: null,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    children: [],
  },
};

// テスト用のタグデータ（UUIDv4形式）
export const testTags = {
  tag1: {
    id: '550e8400-e29b-41d4-a716-446655440030',
    categoryId: '550e8400-e29b-41d4-a716-446655440020',
    name: 'JavaScript',
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: testTagCategories.category1,
    employeeSkills: [],
  },
  tag2: {
    id: '550e8400-e29b-41d4-a716-446655440031',
    categoryId: '550e8400-e29b-41d4-a716-446655440020',
    name: 'TypeScript',
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: testTagCategories.category1,
    employeeSkills: [],
  },
};

/**
 * テスト用のJWTトークンを生成
 */
export const generateTestToken = (user: { id: string; email: string; role: UserRole }): string => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
};

/**
 * 管理者トークンを取得
 */
export const getAdminToken = (): string => {
  return generateTestToken({
    id: testUsers.admin.id,
    email: testUsers.admin.email,
    role: testUsers.admin.role,
  });
};

/**
 * 一般ユーザートークンを取得
 */
export const getUserToken = (): string => {
  return generateTestToken({
    id: testUsers.user.id,
    email: testUsers.user.email,
    role: testUsers.user.role,
  });
};

/**
 * Prismaモックをリセット
 */
export const resetMocks = (): void => {
  jest.clearAllMocks();
};

/**
 * Prismaクライアントのモックインスタンスを取得
 */
export const getMockPrisma = (): any => {
  return new PrismaClient();
};

// グローバルセットアップ
beforeAll(() => {
  // テスト開始前の初期化
});

afterAll(() => {
  // テスト終了後のクリーンアップ
});

beforeEach(() => {
  // 各テスト前にモックをリセット
  resetMocks();
});

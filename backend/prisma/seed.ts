import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 初期データ投入スクリプト
 */
async function main(): Promise<void> {
  console.log('Starting database seed...');

  // ============================================
  // 1. タグカテゴリの作成
  // ============================================
  console.log('Creating tag categories...');

  // カテゴリ: 工程
  const procCategory = await prisma.tagCategory.upsert({
    where: { code: 'PROC' },
    update: {},
    create: {
      code: 'PROC',
      name: '工程',
      sortOrder: 1,
    },
  });

  // カテゴリ: 言語・ランタイム
  const techLangCategory = await prisma.tagCategory.upsert({
    where: { code: 'TECH_LANG' },
    update: {
      name: '言語・ランタイム',
      sortOrder: 2,
      parentId: null,
    },
    create: {
      code: 'TECH_LANG',
      name: '言語・ランタイム',
      sortOrder: 2,
    },
  });

  // カテゴリ: 機構・回路・CAE
  const techCadCategory = await prisma.tagCategory.upsert({
    where: { code: 'TECH_CAD' },
    update: {
      name: '機構・回路・CAE',
      sortOrder: 3,
      parentId: null,
    },
    create: {
      code: 'TECH_CAD',
      name: '機構・回路・CAE',
      sortOrder: 3,
    },
  });

  console.log('Tag categories created:', {
    proc: procCategory.id,
    techLang: techLangCategory.id,
    techCad: techCadCategory.id,
  });

  // ============================================
  // 2. タグの作成
  // ============================================
  console.log('Creating tags...');

  // 工程タグ (18個)
  const procTags = [
    { name: '要件定義', sortOrder: 1 },
    { name: '基本設計', sortOrder: 2 },
    { name: '詳細設計', sortOrder: 3 },
    { name: '実装', sortOrder: 4 },
    { name: '単体テスト', sortOrder: 5 },
    { name: '結合テスト', sortOrder: 6 },
    { name: 'システムテスト', sortOrder: 7 },
    { name: '受入テスト', sortOrder: 8 },
    { name: 'テスト設計', sortOrder: 9 },
    { name: 'テスト実施', sortOrder: 10 },
    { name: '不具合解析', sortOrder: 11 },
    { name: 'レビュー', sortOrder: 12 },
    { name: '運用設計', sortOrder: 13 },
    { name: '運用保守', sortOrder: 14 },
    { name: '監視運用', sortOrder: 15 },
    { name: '性能検証', sortOrder: 16 },
    { name: '障害対応', sortOrder: 17 },
    { name: '改修保守', sortOrder: 18 },
  ];

  for (const tag of procTags) {
    await prisma.tag.upsert({
      where: {
        categoryId_name: {
          categoryId: procCategory.id,
          name: tag.name,
        },
      },
      update: { sortOrder: tag.sortOrder },
      create: {
        categoryId: procCategory.id,
        name: tag.name,
        sortOrder: tag.sortOrder,
      },
    });
  }

  // 言語・ランタイムタグ (20個)
  const langTags = [
    { name: 'C', sortOrder: 1 },
    { name: 'C++', sortOrder: 2 },
    { name: 'C#', sortOrder: 3 },
    { name: 'Java', sortOrder: 4 },
    { name: 'Python', sortOrder: 5 },
    { name: 'JavaScript', sortOrder: 6 },
    { name: 'TypeScript', sortOrder: 7 },
    { name: 'Go', sortOrder: 8 },
    { name: 'Rust', sortOrder: 9 },
    { name: 'PHP', sortOrder: 10 },
    { name: 'Ruby', sortOrder: 11 },
    { name: 'SQL', sortOrder: 12 },
    { name: 'VBA', sortOrder: 13 },
    { name: 'Bash', sortOrder: 14 },
    { name: 'PowerShell', sortOrder: 15 },
    { name: 'HTML', sortOrder: 16 },
    { name: 'CSS', sortOrder: 17 },
    { name: '.NET', sortOrder: 18 },
    { name: 'Node.js', sortOrder: 19 },
    { name: 'MATLAB', sortOrder: 20 },
  ];

  for (const tag of langTags) {
    await prisma.tag.upsert({
      where: {
        categoryId_name: {
          categoryId: techLangCategory.id,
          name: tag.name,
        },
      },
      update: { sortOrder: tag.sortOrder },
      create: {
        categoryId: techLangCategory.id,
        name: tag.name,
        sortOrder: tag.sortOrder,
      },
    });
  }

  // 機構・回路・CAEタグ (26個)
  const cadTags = [
    { name: '3D CAD', sortOrder: 1 },
    { name: '2D CAD', sortOrder: 2 },
    { name: 'SolidWorks', sortOrder: 3 },
    { name: 'CATIA', sortOrder: 4 },
    { name: 'Creo', sortOrder: 5 },
    { name: 'AutoCAD', sortOrder: 6 },
    { name: '公差設計', sortOrder: 7 },
    { name: '材料選定', sortOrder: 8 },
    { name: '熱設計（機構）', sortOrder: 9 },
    { name: '試作対応', sortOrder: 10 },
    { name: '量産対応', sortOrder: 11 },
    { name: '回路設計（アナログ）', sortOrder: 12 },
    { name: '回路設計（デジタル）', sortOrder: 13 },
    { name: '電源回路', sortOrder: 14 },
    { name: 'PCB設計', sortOrder: 15 },
    { name: 'Altium', sortOrder: 16 },
    { name: 'KiCad', sortOrder: 17 },
    { name: 'EMI/EMC対策', sortOrder: 18 },
    { name: '評価・検証（電気）', sortOrder: 19 },
    { name: 'CAE', sortOrder: 20 },
    { name: '構造解析（FEM）', sortOrder: 21 },
    { name: '熱解析', sortOrder: 22 },
    { name: '流体解析（CFD）', sortOrder: 23 },
    { name: '振動解析', sortOrder: 24 },
    { name: 'ANSYS', sortOrder: 25 },
    { name: 'Abaqus', sortOrder: 26 },
  ];

  for (const tag of cadTags) {
    await prisma.tag.upsert({
      where: {
        categoryId_name: {
          categoryId: techCadCategory.id,
          name: tag.name,
        },
      },
      update: { sortOrder: tag.sortOrder },
      create: {
        categoryId: techCadCategory.id,
        name: tag.name,
        sortOrder: tag.sortOrder,
      },
    });
  }

  console.log('Tags created successfully');

  // ============================================
  // 3. 管理者ユーザーの作成
  // ============================================
  console.log('Creating admin user...');

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
  const passwordHash = await bcrypt.hash('password123', saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log('Admin user created:', {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
  });

  // ============================================
  // Summary
  // ============================================
  const categoryCount = await prisma.tagCategory.count();
  const tagCount = await prisma.tag.count();
  const userCount = await prisma.user.count();

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log(`Tag Categories: ${categoryCount}`);
  console.log(`Tags: ${tagCount}`);
  console.log(`Users: ${userCount}`);
  console.log('========================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });

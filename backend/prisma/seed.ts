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
  // 4. 企業データの作成
  // ============================================
  console.log('Creating companies...');

  const companies = await Promise.all([
    prisma.company.upsert({
      where: { code: 'COMP001' },
      update: {},
      create: {
        code: 'COMP001',
        name: '株式会社テックソリューションズ',
        nameKana: 'カブシキガイシャテックソリューションズ',
        postalCode: '100-0001',
        address: '東京都千代田区千代田1-1-1',
        phone: '03-1234-5678',
        website: 'https://techsolutions.example.com',
        industry: 'IT・ソフトウェア',
        status: 'ACTIVE',
        remark: '大手システムインテグレーター',
      },
    }),
    prisma.company.upsert({
      where: { code: 'COMP002' },
      update: {},
      create: {
        code: 'COMP002',
        name: '株式会社グローバル製造',
        nameKana: 'カブシキガイシャグローバルセイゾウ',
        postalCode: '530-0001',
        address: '大阪府大阪市北区梅田2-2-2',
        phone: '06-2345-6789',
        website: 'https://global-mfg.example.com',
        industry: '製造業・機械',
        status: 'ACTIVE',
        remark: '自動車部品メーカー',
      },
    }),
    prisma.company.upsert({
      where: { code: 'COMP003' },
      update: {},
      create: {
        code: 'COMP003',
        name: '株式会社フィンテックジャパン',
        nameKana: 'カブシキガイシャフィンテックジャパン',
        postalCode: '103-0027',
        address: '東京都中央区日本橋3-3-3',
        phone: '03-3456-7890',
        website: 'https://fintech-jp.example.com',
        industry: '金融・保険',
        status: 'ACTIVE',
        remark: '金融システム開発企業',
      },
    }),
    prisma.company.upsert({
      where: { code: 'COMP004' },
      update: {},
      create: {
        code: 'COMP004',
        name: '株式会社メディカルケアシステムズ',
        nameKana: 'カブシキガイシャメディカルケアシステムズ',
        postalCode: '460-0001',
        address: '愛知県名古屋市中区栄4-4-4',
        phone: '052-4567-8901',
        website: 'https://medcare-sys.example.com',
        industry: '医療・ヘルスケア',
        status: 'ACTIVE',
        remark: '医療機器・システム開発',
      },
    }),
    prisma.company.upsert({
      where: { code: 'COMP005' },
      update: {},
      create: {
        code: 'COMP005',
        name: '株式会社エンターテイメントワークス',
        nameKana: 'カブシキガイシャエンターテイメントワークス',
        postalCode: '150-0001',
        address: '東京都渋谷区神宮前5-5-5',
        phone: '03-5678-9012',
        website: 'https://entertainment-works.example.com',
        industry: 'エンターテイメント',
        status: 'ACTIVE',
        remark: 'ゲーム・映像制作',
      },
    }),
  ]);

  console.log(`Created ${companies.length} companies`);

  // ============================================
  // 5. 企業拠点の作成
  // ============================================
  console.log('Creating company offices...');

  // テックソリューションズの拠点
  const techSolOfficeHQ = await prisma.companyOffice.create({
    data: {
      companyId: companies[0].id,
      name: '本社',
      postalCode: '100-0001',
      address: '東京都千代田区千代田1-1-1 テックビル10F',
      phone: '03-1234-5678',
      isHeadquarters: true,
      sortOrder: 1,
    },
  });

  await prisma.companyOffice.create({
    data: {
      companyId: companies[0].id,
      name: '大阪支社',
      postalCode: '530-0001',
      address: '大阪府大阪市北区梅田1-1-1',
      phone: '06-1234-5678',
      isHeadquarters: false,
      sortOrder: 2,
    },
  });

  await prisma.companyOffice.create({
    data: {
      companyId: companies[0].id,
      name: '名古屋支社',
      postalCode: '450-0001',
      address: '愛知県名古屋市中村区名駅1-1-1',
      phone: '052-1234-5678',
      isHeadquarters: false,
      sortOrder: 3,
    },
  });

  // グローバル製造の拠点
  await Promise.all([
    prisma.companyOffice.create({
      data: {
        companyId: companies[1].id,
        name: '本社工場',
        postalCode: '530-0001',
        address: '大阪府大阪市北区梅田2-2-2',
        phone: '06-2345-6789',
        isHeadquarters: true,
        sortOrder: 1,
      },
    }),
    prisma.companyOffice.create({
      data: {
        companyId: companies[1].id,
        name: '浜松工場',
        postalCode: '432-0001',
        address: '静岡県浜松市中区浜松町1-1-1',
        phone: '053-2345-6789',
        isHeadquarters: false,
        sortOrder: 2,
      },
    }),
  ]);

  // その他の企業の本社拠点
  await Promise.all([
    prisma.companyOffice.create({
      data: {
        companyId: companies[2].id,
        name: '本社',
        postalCode: '103-0027',
        address: '東京都中央区日本橋3-3-3',
        phone: '03-3456-7890',
        isHeadquarters: true,
        sortOrder: 1,
      },
    }),
    prisma.companyOffice.create({
      data: {
        companyId: companies[3].id,
        name: '本社',
        postalCode: '460-0001',
        address: '愛知県名古屋市中区栄4-4-4',
        phone: '052-4567-8901',
        isHeadquarters: true,
        sortOrder: 1,
      },
    }),
    prisma.companyOffice.create({
      data: {
        companyId: companies[4].id,
        name: '本社',
        postalCode: '150-0001',
        address: '東京都渋谷区神宮前5-5-5',
        phone: '03-5678-9012',
        isHeadquarters: true,
        sortOrder: 1,
      },
    }),
  ]);

  console.log('Company offices created');

  // ============================================
  // 6. 企業部署の作成（階層構造）
  // ============================================
  console.log('Creating company departments...');

  // テックソリューションズの部署階層
  const techItDiv = await prisma.companyDepartment.create({
    data: {
      companyId: companies[0].id,
      officeId: techSolOfficeHQ.id,
      type: 'DIVISION',
      name: 'IT事業部',
      sortOrder: 1,
    },
  });

  const techDevDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[0].id,
      officeId: techSolOfficeHQ.id,
      parentId: techItDiv.id,
      type: 'DEPARTMENT',
      name: '開発部',
      sortOrder: 1,
    },
  });

  await Promise.all([
    prisma.companyDepartment.create({
      data: {
        companyId: companies[0].id,
        officeId: techSolOfficeHQ.id,
        parentId: techDevDept.id,
        type: 'SECTION',
        name: '第一開発課',
        sortOrder: 1,
      },
    }),
    prisma.companyDepartment.create({
      data: {
        companyId: companies[0].id,
        officeId: techSolOfficeHQ.id,
        parentId: techDevDept.id,
        type: 'SECTION',
        name: '第二開発課',
        sortOrder: 2,
      },
    }),
  ]);

  const techInfraDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[0].id,
      officeId: techSolOfficeHQ.id,
      parentId: techItDiv.id,
      type: 'DEPARTMENT',
      name: 'インフラ部',
      sortOrder: 2,
    },
  });

  // グローバル製造の部署
  const mfgEngDiv = await prisma.companyDepartment.create({
    data: {
      companyId: companies[1].id,
      type: 'DIVISION',
      name: '技術開発本部',
      sortOrder: 1,
    },
  });

  const mfgMechDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[1].id,
      parentId: mfgEngDiv.id,
      type: 'DEPARTMENT',
      name: '機構設計部',
      sortOrder: 1,
    },
  });

  const mfgElecDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[1].id,
      parentId: mfgEngDiv.id,
      type: 'DEPARTMENT',
      name: '電気設計部',
      sortOrder: 2,
    },
  });

  // フィンテックジャパンの部署
  const fintechSysDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[2].id,
      type: 'DEPARTMENT',
      name: 'システム開発部',
      sortOrder: 1,
    },
  });

  // メディカルケアシステムズの部署
  const medDevDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[3].id,
      type: 'DEPARTMENT',
      name: '製品開発部',
      sortOrder: 1,
    },
  });

  // エンターテイメントワークスの部署
  const entGameDept = await prisma.companyDepartment.create({
    data: {
      companyId: companies[4].id,
      type: 'DEPARTMENT',
      name: 'ゲーム開発部',
      sortOrder: 1,
    },
  });

  console.log('Company departments created');

  // ============================================
  // 7. 企業担当窓口の作成
  // ============================================
  console.log('Creating company contacts...');

  await Promise.all([
    // テックソリューションズ
    prisma.companyContact.create({
      data: {
        companyId: companies[0].id,
        departmentId: techDevDept.id,
        name: '山田 太郎',
        nameKana: 'ヤマダ タロウ',
        title: '開発部長',
        email: 'yamada@techsolutions.example.com',
        phone: '03-1234-5678',
        mobile: '090-1234-5678',
        isPrimary: true,
      },
    }),
    prisma.companyContact.create({
      data: {
        companyId: companies[0].id,
        departmentId: techInfraDept.id,
        name: '佐藤 花子',
        nameKana: 'サトウ ハナコ',
        title: 'インフラ部長',
        email: 'sato@techsolutions.example.com',
        phone: '03-1234-5679',
        mobile: '090-2345-6789',
        isPrimary: false,
      },
    }),
    // グローバル製造
    prisma.companyContact.create({
      data: {
        companyId: companies[1].id,
        departmentId: mfgMechDept.id,
        name: '鈴木 一郎',
        nameKana: 'スズキ イチロウ',
        title: '機構設計部長',
        email: 'suzuki@global-mfg.example.com',
        phone: '06-2345-6789',
        mobile: '090-3456-7890',
        isPrimary: true,
      },
    }),
    prisma.companyContact.create({
      data: {
        companyId: companies[1].id,
        departmentId: mfgElecDept.id,
        name: '田中 美咲',
        nameKana: 'タナカ ミサキ',
        title: '電気設計部 課長',
        email: 'tanaka@global-mfg.example.com',
        phone: '06-2345-6790',
        mobile: '090-4567-8901',
        isPrimary: false,
      },
    }),
    // フィンテックジャパン
    prisma.companyContact.create({
      data: {
        companyId: companies[2].id,
        departmentId: fintechSysDept.id,
        name: '高橋 健太',
        nameKana: 'タカハシ ケンタ',
        title: 'システム開発部長',
        email: 'takahashi@fintech-jp.example.com',
        phone: '03-3456-7890',
        mobile: '090-5678-9012',
        isPrimary: true,
      },
    }),
    // メディカルケアシステムズ
    prisma.companyContact.create({
      data: {
        companyId: companies[3].id,
        departmentId: medDevDept.id,
        name: '渡辺 由美',
        nameKana: 'ワタナベ ユミ',
        title: '製品開発部 部長',
        email: 'watanabe@medcare-sys.example.com',
        phone: '052-4567-8901',
        mobile: '090-6789-0123',
        isPrimary: true,
      },
    }),
    prisma.companyContact.create({
      data: {
        companyId: companies[3].id,
        departmentId: medDevDept.id,
        name: '伊藤 誠',
        nameKana: 'イトウ マコト',
        title: '製品開発部 課長',
        email: 'ito@medcare-sys.example.com',
        phone: '052-4567-8902',
        mobile: '090-7890-1234',
        isPrimary: false,
      },
    }),
    // エンターテイメントワークス
    prisma.companyContact.create({
      data: {
        companyId: companies[4].id,
        departmentId: entGameDept.id,
        name: '中村 優子',
        nameKana: 'ナカムラ ユウコ',
        title: 'ゲーム開発部 部長',
        email: 'nakamura@entertainment-works.example.com',
        phone: '03-5678-9012',
        mobile: '090-8901-2345',
        isPrimary: true,
      },
    }),
  ]);

  console.log('Company contacts created');

  // ============================================
  // 8. 案件の作成
  // ============================================
  console.log('Creating projects...');

  const projects = await Promise.all([
    prisma.project.upsert({
      where: { code: 'PRJ001' },
      update: {},
      create: {
        code: 'PRJ001',
        companyId: companies[0].id,
        departmentId: techDevDept.id,
        name: '次世代基幹システム開発プロジェクト',
        description: 'クラウドベースの基幹システムをフルスクラッチ開発',
        contractType: 'CONTRACT',
        contractStartDate: new Date('2024-04-01'),
        contractEndDate: new Date('2025-03-31'),
        budget: 150000000,
        unitPrice: 800000,
        status: 'IN_PROGRESS',
        location: '客先常駐（東京都千代田区）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ002' },
      update: {},
      create: {
        code: 'PRJ002',
        companyId: companies[0].id,
        departmentId: techInfraDept.id,
        name: 'AWSインフラ構築・運用',
        description: 'AWS環境の構築とDevOps基盤の整備',
        contractType: 'SES',
        contractStartDate: new Date('2024-07-01'),
        contractEndDate: new Date('2025-06-30'),
        budget: 48000000,
        unitPrice: 700000,
        status: 'IN_PROGRESS',
        location: '客先常駐（東京都千代田区）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ003' },
      update: {},
      create: {
        code: 'PRJ003',
        companyId: companies[1].id,
        departmentId: mfgMechDept.id,
        name: '自動車部品の3D CAD設計',
        description: '次世代エンジン部品の機構設計と試作',
        contractType: 'DISPATCH',
        contractStartDate: new Date('2024-05-01'),
        contractEndDate: new Date('2025-04-30'),
        budget: 36000000,
        unitPrice: 650000,
        status: 'IN_PROGRESS',
        location: '客先常駐（大阪府大阪市）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ004' },
      update: {},
      create: {
        code: 'PRJ004',
        companyId: companies[1].id,
        departmentId: mfgElecDept.id,
        name: '電動車制御システム開発',
        description: 'EV用パワーエレクトロニクス制御システムの開発',
        contractType: 'CONTRACT',
        contractStartDate: new Date('2024-06-01'),
        contractEndDate: new Date('2025-12-31'),
        budget: 98000000,
        unitPrice: 750000,
        status: 'IN_PROGRESS',
        location: '客先常駐（静岡県浜松市）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ005' },
      update: {},
      create: {
        code: 'PRJ005',
        companyId: companies[2].id,
        departmentId: fintechSysDept.id,
        name: 'モバイルバンキングアプリ開発',
        description: 'スマートフォン向け次世代バンキングアプリの開発',
        contractType: 'CONTRACT',
        contractStartDate: new Date('2024-08-01'),
        contractEndDate: new Date('2025-07-31'),
        budget: 72000000,
        unitPrice: 850000,
        status: 'IN_PROGRESS',
        location: '客先常駐（東京都中央区）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ006' },
      update: {},
      create: {
        code: 'PRJ006',
        companyId: companies[2].id,
        departmentId: fintechSysDept.id,
        name: '決済システム基盤更改',
        description: 'レガシーシステムからマイクロサービスへの移行',
        contractType: 'SES',
        contractStartDate: new Date('2024-10-01'),
        contractEndDate: new Date('2026-03-31'),
        budget: 180000000,
        unitPrice: 900000,
        status: 'IN_PROGRESS',
        location: '客先常駐（東京都中央区）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ007' },
      update: {},
      create: {
        code: 'PRJ007',
        companyId: companies[3].id,
        departmentId: medDevDept.id,
        name: '医療機器組込みソフトウェア開発',
        description: '医療用画像診断装置の制御ソフトウェア開発',
        contractType: 'CONTRACT',
        contractStartDate: new Date('2024-09-01'),
        contractEndDate: new Date('2025-08-31'),
        budget: 54000000,
        unitPrice: 750000,
        status: 'IN_PROGRESS',
        location: '客先常駐（愛知県名古屋市）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ008' },
      update: {},
      create: {
        code: 'PRJ008',
        companyId: companies[3].id,
        departmentId: medDevDept.id,
        name: '患者管理システムUI/UX改善',
        description: '既存システムのフロントエンド全面刷新',
        contractType: 'CONTRACT',
        contractStartDate: new Date('2025-01-01'),
        contractEndDate: new Date('2025-06-30'),
        budget: 28000000,
        unitPrice: 800000,
        status: 'PROPOSAL',
        location: 'リモート可',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ009' },
      update: {},
      create: {
        code: 'PRJ009',
        companyId: companies[4].id,
        departmentId: entGameDept.id,
        name: 'スマホゲーム新規開発',
        description: 'オンラインRPGゲームの企画・開発',
        contractType: 'CONTRACT',
        contractStartDate: new Date('2024-11-01'),
        contractEndDate: new Date('2025-10-31'),
        budget: 120000000,
        unitPrice: 700000,
        status: 'IN_PROGRESS',
        location: '客先常駐（東京都渋谷区）',
      },
    }),
    prisma.project.upsert({
      where: { code: 'PRJ010' },
      update: {},
      create: {
        code: 'PRJ010',
        companyId: companies[4].id,
        departmentId: entGameDept.id,
        name: 'VRコンテンツ制作支援',
        description: 'VR体験施設向けコンテンツの技術支援',
        contractType: 'DISPATCH',
        contractStartDate: new Date('2024-12-01'),
        contractEndDate: new Date('2025-05-31'),
        budget: 21000000,
        unitPrice: 650000,
        status: 'IN_PROGRESS',
        location: '客先常駐（東京都渋谷区）',
      },
    }),
  ]);

  console.log(`Created ${projects.length} projects`);

  // ============================================
  // 9. サンプル社員の作成（案件参画用）
  // ============================================
  console.log('Creating sample employees...');

  const sampleEmployees = await Promise.all([
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0001' },
      update: {},
      create: {
        employeeNumber: 'EMP0001',
        fullName: '山本 太郎',
        fullNameKana: 'ヤマモト タロウ',
        email: 'yamamoto@example.com',
        birthDate: new Date('1990-04-15'),
        gender: 'MALE',
        contractType: 'FULL_TIME',
        department: '開発部',
        position: 'シニアエンジニア',
        hireDate: new Date('2015-04-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0002' },
      update: {},
      create: {
        employeeNumber: 'EMP0002',
        fullName: '佐々木 花子',
        fullNameKana: 'ササキ ハナコ',
        email: 'sasaki@example.com',
        birthDate: new Date('1992-08-22'),
        gender: 'FEMALE',
        contractType: 'FULL_TIME',
        department: 'インフラ部',
        position: 'インフラエンジニア',
        hireDate: new Date('2017-04-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0003' },
      update: {},
      create: {
        employeeNumber: 'EMP0003',
        fullName: '鈴木 健一',
        fullNameKana: 'スズキ ケンイチ',
        email: 'suzuki@example.com',
        birthDate: new Date('1988-12-05'),
        gender: 'MALE',
        contractType: 'FULL_TIME',
        department: '設計部',
        position: '機構設計エンジニア',
        hireDate: new Date('2013-04-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0004' },
      update: {},
      create: {
        employeeNumber: 'EMP0004',
        fullName: '田中 美咲',
        fullNameKana: 'タナカ ミサキ',
        email: 'tanaka@example.com',
        birthDate: new Date('1994-03-18'),
        gender: 'FEMALE',
        contractType: 'CONTRACT',
        department: '設計部',
        position: '電気設計エンジニア',
        hireDate: new Date('2019-07-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0005' },
      update: {},
      create: {
        employeeNumber: 'EMP0005',
        fullName: '高橋 誠',
        fullNameKana: 'タカハシ マコト',
        email: 'takahashi@example.com',
        birthDate: new Date('1991-07-30'),
        gender: 'MALE',
        contractType: 'FULL_TIME',
        department: '開発部',
        position: 'フロントエンドエンジニア',
        hireDate: new Date('2016-04-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0006' },
      update: {},
      create: {
        employeeNumber: 'EMP0006',
        fullName: '伊藤 由美',
        fullNameKana: 'イトウ ユミ',
        email: 'ito@example.com',
        birthDate: new Date('1993-11-12'),
        gender: 'FEMALE',
        contractType: 'FULL_TIME',
        department: '開発部',
        position: 'バックエンドエンジニア',
        hireDate: new Date('2018-04-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0007' },
      update: {},
      create: {
        employeeNumber: 'EMP0007',
        fullName: '渡辺 翔太',
        fullNameKana: 'ワタナベ ショウタ',
        email: 'watanabe@example.com',
        birthDate: new Date('1995-02-28'),
        gender: 'MALE',
        contractType: 'CONTRACT',
        department: '開発部',
        position: 'ゲームプログラマー',
        hireDate: new Date('2020-10-01'),
        status: 'ACTIVE',
      },
    }),
    prisma.employee.upsert({
      where: { employeeNumber: 'EMP0008' },
      update: {},
      create: {
        employeeNumber: 'EMP0008',
        fullName: '中村 優子',
        fullNameKana: 'ナカムラ ユウコ',
        email: 'nakamura@example.com',
        birthDate: new Date('1989-09-20'),
        gender: 'FEMALE',
        contractType: 'FULL_TIME',
        department: '開発部',
        position: 'プロジェクトマネージャー',
        hireDate: new Date('2014-04-01'),
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log(`Created ${sampleEmployees.length} sample employees`);

  // ============================================
  // 10. 案件参画の作成
  // ============================================
  console.log('Creating project assignments...');

  await Promise.all([
    // PRJ001 - 次世代基幹システム開発
    prisma.projectAssignment.create({
      data: {
        projectId: projects[0].id,
        employeeId: sampleEmployees[7].id, // 中村優子（PM）
        role: 'プロジェクトマネージャー',
        assignmentStartDate: new Date('2024-04-01'),
        workloadPercentage: 100,
        unitPrice: 900000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[0].id,
        employeeId: sampleEmployees[0].id, // 山本太郎
        role: 'リードエンジニア',
        assignmentStartDate: new Date('2024-04-01'),
        workloadPercentage: 100,
        unitPrice: 850000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[0].id,
        employeeId: sampleEmployees[5].id, // 伊藤由美
        role: 'バックエンドエンジニア',
        assignmentStartDate: new Date('2024-05-01'),
        workloadPercentage: 100,
        unitPrice: 750000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[0].id,
        employeeId: sampleEmployees[4].id, // 高橋誠
        role: 'フロントエンドエンジニア',
        assignmentStartDate: new Date('2024-05-01'),
        workloadPercentage: 100,
        unitPrice: 750000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ002 - AWSインフラ構築・運用
    prisma.projectAssignment.create({
      data: {
        projectId: projects[1].id,
        employeeId: sampleEmployees[1].id, // 佐々木花子
        role: 'インフラエンジニア',
        assignmentStartDate: new Date('2024-07-01'),
        workloadPercentage: 100,
        unitPrice: 800000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ003 - 自動車部品の3D CAD設計
    prisma.projectAssignment.create({
      data: {
        projectId: projects[2].id,
        employeeId: sampleEmployees[2].id, // 鈴木健一
        role: '機構設計エンジニア',
        assignmentStartDate: new Date('2024-05-01'),
        workloadPercentage: 100,
        unitPrice: 700000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ004 - 電動車制御システム開発
    prisma.projectAssignment.create({
      data: {
        projectId: projects[3].id,
        employeeId: sampleEmployees[3].id, // 田中美咲
        role: '電気設計エンジニア',
        assignmentStartDate: new Date('2024-06-01'),
        workloadPercentage: 100,
        unitPrice: 750000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ005 - モバイルバンキングアプリ開発
    prisma.projectAssignment.create({
      data: {
        projectId: projects[4].id,
        employeeId: sampleEmployees[4].id, // 高橋誠
        role: 'フロントエンドエンジニア',
        assignmentStartDate: new Date('2024-08-01'),
        assignmentEndDate: new Date('2024-12-31'),
        workloadPercentage: 50,
        unitPrice: 850000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
        remark: '前半フェーズのみ参画',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[4].id,
        employeeId: sampleEmployees[5].id, // 伊藤由美
        role: 'バックエンドエンジニア',
        assignmentStartDate: new Date('2024-08-01'),
        assignmentEndDate: new Date('2024-11-30'),
        workloadPercentage: 50,
        unitPrice: 800000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
        remark: '初期構築フェーズ',
      },
    }),

    // PRJ006 - 決済システム基盤更改
    prisma.projectAssignment.create({
      data: {
        projectId: projects[5].id,
        employeeId: sampleEmployees[0].id, // 山本太郎
        role: 'アーキテクト',
        assignmentStartDate: new Date('2024-10-01'),
        assignmentEndDate: new Date('2024-12-31'),
        workloadPercentage: 50,
        unitPrice: 950000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
        remark: 'アーキテクチャ設計フェーズ',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[5].id,
        employeeId: sampleEmployees[5].id, // 伊藤由美
        role: 'バックエンドエンジニア',
        assignmentStartDate: new Date('2025-01-01'),
        workloadPercentage: 100,
        unitPrice: 900000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ007 - 医療機器組込みソフトウェア開発
    prisma.projectAssignment.create({
      data: {
        projectId: projects[6].id,
        employeeId: sampleEmployees[0].id, // 山本太郎
        role: '組込みエンジニア',
        assignmentStartDate: new Date('2025-01-01'),
        workloadPercentage: 100,
        unitPrice: 800000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ009 - スマホゲーム新規開発
    prisma.projectAssignment.create({
      data: {
        projectId: projects[8].id,
        employeeId: sampleEmployees[6].id, // 渡辺翔太
        role: 'ゲームプログラマー',
        assignmentStartDate: new Date('2024-11-01'),
        workloadPercentage: 100,
        unitPrice: 700000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[8].id,
        employeeId: sampleEmployees[4].id, // 高橋誠
        role: 'UI/UXエンジニア',
        assignmentStartDate: new Date('2025-01-01'),
        workloadPercentage: 50,
        unitPrice: 750000,
        billingType: 'MONTHLY',
        status: 'IN_PROGRESS',
      },
    }),

    // PRJ010 - VRコンテンツ制作支援
    prisma.projectAssignment.create({
      data: {
        projectId: projects[9].id,
        employeeId: sampleEmployees[6].id, // 渡辺翔太
        role: 'VRエンジニア',
        assignmentStartDate: new Date('2024-12-01'),
        assignmentEndDate: new Date('2025-02-28'),
        workloadPercentage: 50,
        unitPrice: 650000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
      },
    }),

    // 過去の参画履歴（完了済み）
    prisma.projectAssignment.create({
      data: {
        projectId: projects[1].id,
        employeeId: sampleEmployees[1].id, // 佐々木花子
        role: 'インフラエンジニア',
        assignmentStartDate: new Date('2023-07-01'),
        assignmentEndDate: new Date('2024-06-30'),
        workloadPercentage: 100,
        unitPrice: 750000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
        remark: '前年度契約',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[2].id,
        employeeId: sampleEmployees[2].id, // 鈴木健一
        role: '機構設計エンジニア',
        assignmentStartDate: new Date('2023-05-01'),
        assignmentEndDate: new Date('2024-04-30'),
        workloadPercentage: 100,
        unitPrice: 650000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
        remark: '前年度契約',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[3].id,
        employeeId: sampleEmployees[3].id, // 田中美咲
        role: '電気設計エンジニア',
        assignmentStartDate: new Date('2023-06-01'),
        assignmentEndDate: new Date('2024-05-31'),
        workloadPercentage: 100,
        unitPrice: 700000,
        billingType: 'MONTHLY',
        status: 'COMPLETED',
        remark: '前年度契約',
      },
    }),

    // 将来の参画予定
    prisma.projectAssignment.create({
      data: {
        projectId: projects[7].id, // PRJ008 - UI/UX改善
        employeeId: sampleEmployees[4].id, // 高橋誠
        role: 'フロントエンドエンジニア',
        assignmentStartDate: new Date('2025-03-01'),
        workloadPercentage: 80,
        unitPrice: 800000,
        billingType: 'MONTHLY',
        status: 'SCHEDULED',
      },
    }),
    prisma.projectAssignment.create({
      data: {
        projectId: projects[7].id, // PRJ008 - UI/UX改善
        employeeId: sampleEmployees[7].id, // 中村優子
        role: 'プロジェクトリーダー',
        assignmentStartDate: new Date('2025-02-01'),
        workloadPercentage: 50,
        unitPrice: 850000,
        billingType: 'MONTHLY',
        status: 'SCHEDULED',
      },
    }),
  ]);

  console.log('Project assignments created (20+ records)');

  // ============================================
  // Summary
  // ============================================
  const categoryCount = await prisma.tagCategory.count();
  const tagCount = await prisma.tag.count();
  const userCount = await prisma.user.count();
  const companyCount = await prisma.company.count();
  const officeCount = await prisma.companyOffice.count();
  const departmentCount = await prisma.companyDepartment.count();
  const contactCount = await prisma.companyContact.count();
  const projectCount = await prisma.project.count();
  const employeeCount = await prisma.employee.count();
  const assignmentCount = await prisma.projectAssignment.count();

  console.log('\n========================================');
  console.log('Seed completed successfully!');
  console.log('========================================');
  console.log('【Phase 1: タグ・ユーザー】');
  console.log(`  Tag Categories: ${categoryCount}`);
  console.log(`  Tags: ${tagCount}`);
  console.log(`  Users: ${userCount}`);
  console.log('【Phase 2: 企業・案件】');
  console.log(`  Companies: ${companyCount}`);
  console.log(`  Company Offices: ${officeCount}`);
  console.log(`  Company Departments: ${departmentCount}`);
  console.log(`  Company Contacts: ${contactCount}`);
  console.log(`  Projects: ${projectCount}`);
  console.log(`  Employees: ${employeeCount}`);
  console.log(`  Project Assignments: ${assignmentCount}`);
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

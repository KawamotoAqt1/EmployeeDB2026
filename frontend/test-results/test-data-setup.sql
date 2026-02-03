-- ============================================================
-- テストデータ作成スクリプト - 企業管理機能
-- ============================================================
-- このスクリプトは企業管理機能のテストに必要なデータを生成します
-- 実行前に既存のデータをバックアップしてください
-- ============================================================

-- 注意: このスクリプトは開発環境でのみ実行してください
-- 本番環境では実行しないでください

-- ============================================================
-- 1. テスト用企業データの作成
-- ============================================================

-- テスト企業1: 拠点・部署・担当者すべて登録済み
INSERT INTO companies (id, name, name_kana, industry, status, website, remark, created_at, updated_at)
VALUES (
  'test-company-001',
  '株式会社テクノロジーパートナーズ',
  'カブシキガイシャテクノロジーパートナーズ',
  'IT・ソフトウェア',
  'ACTIVE',
  'https://example.com/tech-partners',
  'システム開発パートナー企業。長期取引実績あり。',
  NOW(),
  NOW()
);

-- テスト企業2: 最小限の情報のみ
INSERT INTO companies (id, name, name_kana, industry, status, created_at, updated_at)
VALUES (
  'test-company-002',
  'サンプル商事株式会社',
  'サンプルショウジカブシキガイシャ',
  '商社',
  'ACTIVE',
  NOW(),
  NOW()
);

-- テスト企業3: 取引停止ステータス
INSERT INTO companies (id, name, name_kana, industry, status, website, remark, created_at, updated_at)
VALUES (
  'test-company-003',
  'グローバルトレーディング株式会社',
  'グローバルトレーディングカブシキガイシャ',
  '貿易',
  'INACTIVE',
  'https://example.com/global-trading',
  '一時的に取引を停止中。再開検討中。',
  NOW(),
  NOW()
);

-- テスト企業4: 取引終了ステータス
INSERT INTO companies (id, name, name_kana, industry, status, remark, created_at, updated_at)
VALUES (
  'test-company-004',
  '株式会社オールドパートナー',
  'カブシキガイシャオールドパートナー',
  '製造業',
  'TERMINATED',
  '2025年12月末で取引終了。',
  NOW(),
  NOW()
);

-- テスト企業5-24: ページネーションテスト用データ
INSERT INTO companies (id, name, name_kana, industry, status, created_at, updated_at)
VALUES
  ('test-company-005', '株式会社アルファ', 'カブシキガイシャアルファ', 'IT・ソフトウェア', 'ACTIVE', NOW(), NOW()),
  ('test-company-006', '株式会社ベータ', 'カブシキガイシャベータ', 'コンサルティング', 'ACTIVE', NOW(), NOW()),
  ('test-company-007', '株式会社ガンマ', 'カブシキガイシャガンマ', '金融', 'ACTIVE', NOW(), NOW()),
  ('test-company-008', '株式会社デルタ', 'カブシキガイシャデルタ', '不動産', 'ACTIVE', NOW(), NOW()),
  ('test-company-009', '株式会社イプシロン', 'カブシキガイシャイプシロン', '小売', 'ACTIVE', NOW(), NOW()),
  ('test-company-010', '株式会社ゼータ', 'カブシキガイシャゼータ', '製造業', 'ACTIVE', NOW(), NOW()),
  ('test-company-011', '株式会社イータ', 'カブシキガイシャイータ', 'サービス', 'ACTIVE', NOW(), NOW()),
  ('test-company-012', '株式会社シータ', 'カブシキガイシャシータ', '建設', 'ACTIVE', NOW(), NOW()),
  ('test-company-013', '株式会社イオタ', 'カブシキガイシャイオタ', '運輸', 'ACTIVE', NOW(), NOW()),
  ('test-company-014', '株式会社カッパ', 'カブシキガイシャカッパ', '通信', 'ACTIVE', NOW(), NOW()),
  ('test-company-015', '株式会社ラムダ', 'カブシキガイシャラムダ', 'エネルギー', 'ACTIVE', NOW(), NOW()),
  ('test-company-016', '株式会社ミュー', 'カブシキガイシャミュー', '医療', 'ACTIVE', NOW(), NOW()),
  ('test-company-017', '株式会社ニュー', 'カブシキガイシャニュー', '教育', 'ACTIVE', NOW(), NOW()),
  ('test-company-018', '株式会社グザイ', 'カブシキガイシャグザイ', '広告', 'ACTIVE', NOW(), NOW()),
  ('test-company-019', '株式会社オミクロン', 'カブシキガイシャオミクロン', 'メディア', 'ACTIVE', NOW(), NOW()),
  ('test-company-020', '株式会社パイ', 'カブシキガイシャパイ', '旅行', 'ACTIVE', NOW(), NOW()),
  ('test-company-021', '株式会社ロー', 'カブシキガイシャロー', '飲食', 'INACTIVE', NOW(), NOW()),
  ('test-company-022', '株式会社シグマ', 'カブシキガイシャシグマ', '化学', 'ACTIVE', NOW(), NOW()),
  ('test-company-023', '株式会社タウ', 'カブシキガイシャタウ', '機械', 'ACTIVE', NOW(), NOW()),
  ('test-company-024', '株式会社ユプシロン', 'カブシキガイシャユプシロン', '電子', 'TERMINATED', NOW(), NOW());

-- ============================================================
-- 2. 拠点データの作成
-- ============================================================

-- テスト企業1の拠点
INSERT INTO offices (id, company_id, name, postal_code, address, phone, is_primary, created_at, updated_at)
VALUES
  (
    'test-office-001',
    'test-company-001',
    '本社',
    '100-0001',
    '東京都千代田区千代田1-1-1 テクノロジータワー10F',
    '03-1234-5678',
    true,
    NOW(),
    NOW()
  ),
  (
    'test-office-002',
    'test-company-001',
    '大阪支社',
    '530-0001',
    '大阪府大阪市北区梅田1-1-1 大阪ビル5F',
    '06-1234-5678',
    false,
    NOW(),
    NOW()
  ),
  (
    'test-office-003',
    'test-company-001',
    '名古屋営業所',
    '450-0002',
    '愛知県名古屋市中村区名駅1-1-1 名古屋ビル3F',
    '052-123-4567',
    false,
    NOW(),
    NOW()
  );

-- テスト企業3の拠点
INSERT INTO offices (id, company_id, name, postal_code, address, phone, is_primary, created_at, updated_at)
VALUES
  (
    'test-office-004',
    'test-company-003',
    '本社',
    '105-0001',
    '東京都港区虎ノ門1-1-1 グローバルビル20F',
    '03-9876-5432',
    true,
    NOW(),
    NOW()
  );

-- ============================================================
-- 3. 部署データの作成
-- ============================================================

-- テスト企業1の部署(階層構造)
INSERT INTO departments (id, company_id, name, parent_id, created_at, updated_at)
VALUES
  -- トップレベル部署
  ('test-dept-001', 'test-company-001', '経営企画部', NULL, NOW(), NOW()),
  ('test-dept-002', 'test-company-001', '営業本部', NULL, NOW(), NOW()),
  ('test-dept-003', 'test-company-001', '開発本部', NULL, NOW(), NOW()),
  ('test-dept-004', 'test-company-001', '管理部', NULL, NOW(), NOW()),

  -- 営業本部配下
  ('test-dept-005', 'test-company-001', '第一営業部', 'test-dept-002', NOW(), NOW()),
  ('test-dept-006', 'test-company-001', '第二営業部', 'test-dept-002', NOW(), NOW()),
  ('test-dept-007', 'test-company-001', 'カスタマーサポート部', 'test-dept-002', NOW(), NOW()),

  -- 開発本部配下
  ('test-dept-008', 'test-company-001', 'フロントエンド開発部', 'test-dept-003', NOW(), NOW()),
  ('test-dept-009', 'test-company-001', 'バックエンド開発部', 'test-dept-003', NOW(), NOW()),
  ('test-dept-010', 'test-company-001', 'インフラ部', 'test-dept-003', NOW(), NOW()),
  ('test-dept-011', 'test-company-001', 'QA部', 'test-dept-003', NOW(), NOW()),

  -- 管理部配下
  ('test-dept-012', 'test-company-001', '総務課', 'test-dept-004', NOW(), NOW()),
  ('test-dept-013', 'test-company-001', '経理課', 'test-dept-004', NOW(), NOW()),
  ('test-dept-014', 'test-company-001', '人事課', 'test-dept-004', NOW(), NOW());

-- テスト企業3の部署(シンプルな構造)
INSERT INTO departments (id, company_id, name, parent_id, created_at, updated_at)
VALUES
  ('test-dept-015', 'test-company-003', '営業部', NULL, NOW(), NOW()),
  ('test-dept-016', 'test-company-003', '業務部', NULL, NOW(), NOW());

-- ============================================================
-- 4. 担当窓口データの作成
-- ============================================================

-- テスト企業1の担当窓口
INSERT INTO contacts (id, company_id, full_name, full_name_kana, position, department_id, email, phone, mobile, is_primary, remark, created_at, updated_at)
VALUES
  (
    'test-contact-001',
    'test-company-001',
    '山田太郎',
    'ヤマダタロウ',
    '営業本部長',
    'test-dept-002',
    'yamada@tech-partners.example.com',
    '03-1234-5678',
    '090-1234-5678',
    true,
    '主担当窓口。案件全般に関する相談可能。',
    NOW(),
    NOW()
  ),
  (
    'test-contact-002',
    'test-company-001',
    '佐藤花子',
    'サトウハナコ',
    '第一営業部 部長',
    'test-dept-005',
    'sato@tech-partners.example.com',
    '03-1234-5679',
    '090-1234-5679',
    false,
    '東日本エリア担当。',
    NOW(),
    NOW()
  ),
  (
    'test-contact-003',
    'test-company-001',
    '鈴木一郎',
    'スズキイチロウ',
    '開発本部長',
    'test-dept-003',
    'suzuki@tech-partners.example.com',
    '03-1234-5680',
    '090-1234-5680',
    false,
    '技術的な相談窓口。',
    NOW(),
    NOW()
  ),
  (
    'test-contact-004',
    'test-company-001',
    '田中美咲',
    'タナカミサキ',
    'カスタマーサポート部長',
    'test-dept-007',
    'tanaka@tech-partners.example.com',
    '03-1234-5681',
    '090-1234-5681',
    false,
    '契約後のサポート窓口。',
    NOW(),
    NOW()
  );

-- テスト企業3の担当窓口
INSERT INTO contacts (id, company_id, full_name, full_name_kana, position, department_id, email, phone, mobile, is_primary, created_at, updated_at)
VALUES
  (
    'test-contact-005',
    'test-company-003',
    '高橋健一',
    'タカハシケンイチ',
    '営業部長',
    'test-dept-015',
    'takahashi@global-trading.example.com',
    '03-9876-5432',
    '090-9876-5432',
    true,
    NOW(),
    NOW()
  );

-- テスト企業5の担当窓口(部署なし)
INSERT INTO contacts (id, company_id, full_name, full_name_kana, position, email, phone, is_primary, created_at, updated_at)
VALUES
  (
    'test-contact-006',
    'test-company-005',
    '伊藤誠',
    'イトウマコト',
    '代表取締役',
    'ito@alpha.example.com',
    '03-1111-2222',
    true,
    NOW(),
    NOW()
  );

-- ============================================================
-- 5. データ確認用クエリ
-- ============================================================

-- 以下のクエリで作成されたデータを確認できます:

-- 企業一覧
-- SELECT id, name, industry, status FROM companies WHERE id LIKE 'test-company-%' ORDER BY name;

-- 拠点一覧
-- SELECT o.id, c.name as company_name, o.name as office_name, o.is_primary
-- FROM offices o
-- JOIN companies c ON o.company_id = c.id
-- WHERE o.id LIKE 'test-office-%';

-- 部署階層
-- SELECT d.id, c.name as company_name, d.name as dept_name, d.parent_id, p.name as parent_name
-- FROM departments d
-- JOIN companies c ON d.company_id = c.id
-- LEFT JOIN departments p ON d.parent_id = p.id
-- WHERE d.id LIKE 'test-dept-%'
-- ORDER BY c.name, d.parent_id NULLS FIRST, d.name;

-- 担当窓口一覧
-- SELECT co.id, c.name as company_name, co.full_name, co.position, d.name as dept_name, co.is_primary
-- FROM contacts co
-- JOIN companies c ON co.company_id = c.id
-- LEFT JOIN departments d ON co.department_id = d.id
-- WHERE co.id LIKE 'test-contact-%';

-- ============================================================
-- 6. テストデータ削除スクリプト
-- ============================================================

-- テストが完了したら、以下のスクリプトでテストデータを削除できます:

-- DELETE FROM contacts WHERE id LIKE 'test-contact-%';
-- DELETE FROM departments WHERE id LIKE 'test-dept-%';
-- DELETE FROM offices WHERE id LIKE 'test-office-%';
-- DELETE FROM companies WHERE id LIKE 'test-company-%';

-- ============================================================
-- 注意事項
-- ============================================================

-- 1. このスクリプトは開発環境専用です
-- 2. 本番環境では実行しないでください
-- 3. 既存のデータと競合する可能性があります
-- 4. テスト完了後は必ずデータを削除してください
-- 5. UUIDではなく固定IDを使用しているため、再実行時はエラーになる可能性があります
--    その場合は先に削除スクリプトを実行してください

-- ============================================================
-- 実行方法
-- ============================================================

-- PostgreSQLに接続して以下のコマンドで実行:
-- psql -U postgres -d employeedb -f test-data-setup.sql

-- または、DBeaverやpgAdminなどのGUIツールで実行してください

-- ============================================================
-- 作成日: 2026-02-02
-- ============================================================

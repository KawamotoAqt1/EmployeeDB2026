# 案件・企業管理システム データベース設計書

## 概要

社員管理システムに案件管理・企業管理機能を追加するためのデータベース設計。
社員と案件の紐付けにより、双方向から参画情報を参照可能にする。

---

## エンティティ一覧

### 1. 企業関連
- companies（企業）
- company_offices（拠点）
- company_departments（部署）
- company_contacts（担当窓口）

### 2. 案件関連
- projects（案件）
- project_assignments（案件参画）

---

## テーブル定義

### companies（企業）

企業の基本情報を管理するマスタテーブル。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 企業ID |
| code | VARCHAR(50) | UNIQUE, NOT NULL | 企業コード |
| name | VARCHAR(200) | NOT NULL | 企業名 |
| name_kana | VARCHAR(200) | | 企業名カナ |
| postal_code | VARCHAR(10) | | 郵便番号 |
| address | TEXT | | 本社住所 |
| phone | VARCHAR(20) | | 代表電話番号 |
| website | VARCHAR(500) | | Webサイト |
| industry | VARCHAR(100) | | 業種 |
| status | ENUM | NOT NULL, DEFAULT 'ACTIVE' | ステータス |
| remark | TEXT | | 備考 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**status 値:**
- `ACTIVE` - 取引中
- `INACTIVE` - 休止中
- `TERMINATED` - 取引終了

**インデックス:**
- `idx_companies_code` ON (code)
- `idx_companies_name` ON (name)
- `idx_companies_status` ON (status)

---

### company_offices（拠点）

企業の拠点（本社、支社、営業所など）を管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 拠点ID |
| company_id | UUID | FK → companies, NOT NULL | 企業ID |
| name | VARCHAR(200) | NOT NULL | 拠点名 |
| postal_code | VARCHAR(10) | | 郵便番号 |
| address | TEXT | | 住所 |
| phone | VARCHAR(20) | | 電話番号 |
| is_headquarters | BOOLEAN | DEFAULT FALSE | 本社フラグ |
| sort_order | INT | DEFAULT 0 | 表示順序 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**インデックス:**
- `idx_company_offices_company_id` ON (company_id)

---

### company_departments（部署）

企業の組織構造を表現する階層型テーブル。
自己参照により、事業部→部→課→係などの任意の深さの階層に対応。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 部署ID |
| company_id | UUID | FK → companies, NOT NULL | 企業ID |
| office_id | UUID | FK → company_offices, NULL | 拠点ID（任意） |
| parent_id | UUID | FK → company_departments, NULL | 親部署ID |
| type | ENUM | NOT NULL | 部署タイプ |
| name | VARCHAR(200) | NOT NULL | 部署名 |
| sort_order | INT | DEFAULT 0 | 表示順序 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**type 値:**
- `DIVISION` - 事業部
- `DEPARTMENT` - 部
- `SECTION` - 課
- `UNIT` - 係
- `OTHER` - その他

**インデックス:**
- `idx_company_departments_company_id` ON (company_id)
- `idx_company_departments_parent_id` ON (parent_id)

**階層構造例:**
```
本社（拠点）
├── IT事業部（DIVISION）
│   ├── 開発部（DEPARTMENT）
│   │   ├── 第一開発課（SECTION）
│   │   └── 第二開発課（SECTION）
│   └── インフラ部（DEPARTMENT）
└── 営業事業部（DIVISION）
    └── 営業第一部（DEPARTMENT）
```

---

### company_contacts（担当窓口）

企業の担当者情報を管理。複数の担当者を登録可能。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 担当者ID |
| company_id | UUID | FK → companies, NOT NULL | 企業ID |
| department_id | UUID | FK → company_departments, NULL | 部署ID（任意） |
| name | VARCHAR(100) | NOT NULL | 担当者名 |
| name_kana | VARCHAR(100) | | 担当者名カナ |
| title | VARCHAR(100) | | 役職 |
| email | VARCHAR(255) | | メールアドレス |
| phone | VARCHAR(20) | | 電話番号 |
| mobile | VARCHAR(20) | | 携帯電話番号 |
| is_primary | BOOLEAN | DEFAULT FALSE | 主担当フラグ |
| remark | TEXT | | 備考 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**インデックス:**
- `idx_company_contacts_company_id` ON (company_id)
- `idx_company_contacts_email` ON (email)

---

### projects（案件）

企業からの受注案件を管理。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 案件ID |
| company_id | UUID | FK → companies, NOT NULL | 企業ID |
| department_id | UUID | FK → company_departments, NULL | 部署ID（任意） |
| code | VARCHAR(50) | UNIQUE, NOT NULL | 案件コード |
| name | VARCHAR(200) | NOT NULL | 案件名 |
| description | TEXT | | 案件内容 |
| contract_type | ENUM | NOT NULL | 契約形態 |
| contract_start_date | DATE | | 契約開始日 |
| contract_end_date | DATE | | 契約終了日 |
| delivery_date | DATE | | 納期 |
| budget | DECIMAL(15,2) | | 予算額 |
| unit_price | DECIMAL(15,2) | | 単価（人月単価など） |
| status | ENUM | NOT NULL, DEFAULT 'PROPOSAL' | 案件ステータス |
| location | VARCHAR(200) | | 作業場所 |
| remark | TEXT | | 備考 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**contract_type 値:**
- `DISPATCH` - 派遣
- `SES` - 準委任（SES）
- `CONTRACT` - 請負

**status 値:**
- `PROPOSAL` - 提案中
- `IN_PROGRESS` - 進行中
- `COMPLETED` - 完了
- `CANCELLED` - 中止
- `ON_HOLD` - 保留

**インデックス:**
- `idx_projects_code` ON (code)
- `idx_projects_company_id` ON (company_id)
- `idx_projects_status` ON (status)
- `idx_projects_contract_dates` ON (contract_start_date, contract_end_date)

---

### project_assignments（案件参画）

社員と案件の紐付けを管理する中間テーブル。
開始日・終了日により履歴管理も実現。

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PK | 参画ID |
| project_id | UUID | FK → projects, NOT NULL | 案件ID |
| employee_id | UUID | FK → employees, NOT NULL | 社員ID |
| role | VARCHAR(100) | | 役割（PM/PL/メンバー等） |
| assignment_start_date | DATE | NOT NULL | 参画開始日 |
| assignment_end_date | DATE | | 参画終了日（NULL=現在参画中） |
| workload_percentage | INT | | 稼働率（％） |
| unit_price | DECIMAL(15,2) | | 単価（この案件での単価） |
| billing_type | ENUM | | 請求形態 |
| status | ENUM | NOT NULL, DEFAULT 'SCHEDULED' | 参画ステータス |
| remark | TEXT | | 備考 |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 更新日時 |

**billing_type 値:**
- `HOURLY` - 時給
- `DAILY` - 日給
- `MONTHLY` - 月給
- `FIXED` - 固定額

**status 値:**
- `SCHEDULED` - 予定
- `IN_PROGRESS` - 参画中
- `COMPLETED` - 終了

**インデックス:**
- `idx_project_assignments_project_id` ON (project_id)
- `idx_project_assignments_employee_id` ON (employee_id)
- `idx_project_assignments_dates` ON (assignment_start_date, assignment_end_date)
- `idx_project_assignments_status` ON (status)

**ユニーク制約:**
- `unique_active_assignment` ON (project_id, employee_id, assignment_start_date) WHERE assignment_end_date IS NULL
  - 同一社員が同一案件に同時期に重複参画しないように

---

## リレーション図

```
┌─────────────┐
│  companies  │
│  (企業)     │
└──────┬──────┘
       │ 1
       │
       ├──────────────────┐
       │                  │
       │ N                │ N
       │                  │
┌──────▼──────┐    ┌─────▼────────────┐
│company_     │    │company_          │
│offices      │    │departments       │
│(拠点)       │    │(部署)            │◄──┐
└──────┬──────┘    └─────┬────────────┘   │
       │ 1                │ 1               │
       │                  │                 │ 自己参照
       │ N                │ N               │ (階層)
       │                  │                 │
       │           ┌──────▼──────┐          │
       │           │company_     │          │
       │           │contacts     ├──────────┘
       │           │(担当窓口)   │
       │           └─────────────┘
       │
       │
       │           ┌─────────────┐
       └───────────►│  projects   │
                   │  (案件)     │
                   └──────┬──────┘
                          │ 1
                          │
                          │ N
                          │
                   ┌──────▼──────────┐
                   │project_         │
                   │assignments      │
                   │(案件参画)       │
                   └──────┬──────────┘
                          │ N
                          │
                          │ 1
                          │
                   ┌──────▼──────┐
                   │  employees  │
                   │  (社員)     │
                   └─────────────┘
```

---

## 主要なクエリパターン

### 1. 社員の参画履歴を取得

特定の社員が参画した全案件とその詳細を取得。

```sql
SELECT
  p.code,
  p.name AS project_name,
  c.name AS company_name,
  pa.role,
  pa.assignment_start_date,
  pa.assignment_end_date,
  pa.workload_percentage,
  pa.status
FROM project_assignments pa
JOIN projects p ON pa.project_id = p.id
JOIN companies c ON p.company_id = c.id
WHERE pa.employee_id = ?
ORDER BY pa.assignment_start_date DESC;
```

### 2. 案件に参画している社員一覧

特定の案件に参画している（または参画していた）社員を取得。

```sql
SELECT
  e.employee_number,
  e.full_name,
  pa.role,
  pa.assignment_start_date,
  pa.assignment_end_date,
  pa.workload_percentage,
  pa.status
FROM project_assignments pa
JOIN employees e ON pa.employee_id = e.id
WHERE pa.project_id = ?
ORDER BY pa.assignment_start_date DESC;
```

### 3. 現在稼働中の社員と案件

終了日が未設定または未来の参画情報を取得。

```sql
SELECT
  e.full_name AS employee_name,
  p.name AS project_name,
  c.name AS company_name,
  pa.role,
  pa.workload_percentage,
  pa.assignment_start_date
FROM project_assignments pa
JOIN employees e ON pa.employee_id = e.id
JOIN projects p ON pa.project_id = p.id
JOIN companies c ON p.company_id = c.id
WHERE pa.status = 'IN_PROGRESS'
  AND (pa.assignment_end_date IS NULL
       OR pa.assignment_end_date >= CURRENT_DATE)
ORDER BY e.full_name, pa.assignment_start_date DESC;
```

### 4. 企業ごとの案件一覧

特定の企業の全案件と参画社員数を取得。

```sql
SELECT
  p.code,
  p.name,
  p.status,
  p.contract_start_date,
  p.contract_end_date,
  COUNT(DISTINCT pa.employee_id) AS employee_count
FROM projects p
LEFT JOIN project_assignments pa ON p.id = pa.project_id
  AND pa.status = 'IN_PROGRESS'
WHERE p.company_id = ?
GROUP BY p.id, p.code, p.name, p.status, p.contract_start_date, p.contract_end_date
ORDER BY p.contract_start_date DESC;
```

### 5. 稼働率の集計

特定期間における社員の稼働率合計を取得。

```sql
SELECT
  e.employee_number,
  e.full_name,
  SUM(pa.workload_percentage) AS total_workload
FROM employees e
LEFT JOIN project_assignments pa ON e.id = pa.employee_id
WHERE pa.assignment_start_date <= ?
  AND (pa.assignment_end_date IS NULL OR pa.assignment_end_date >= ?)
GROUP BY e.id, e.employee_number, e.full_name
HAVING SUM(pa.workload_percentage) > 0
ORDER BY total_workload DESC;
```

### 6. 企業の組織階層を取得

再帰クエリで企業の部署階層を取得。

```sql
WITH RECURSIVE dept_tree AS (
  -- ルート部署（親がない部署）
  SELECT
    id,
    company_id,
    parent_id,
    name,
    type,
    0 AS level,
    ARRAY[id] AS path
  FROM company_departments
  WHERE company_id = ? AND parent_id IS NULL

  UNION ALL

  -- 子部署を再帰的に取得
  SELECT
    d.id,
    d.company_id,
    d.parent_id,
    d.name,
    d.type,
    dt.level + 1,
    dt.path || d.id
  FROM company_departments d
  JOIN dept_tree dt ON d.parent_id = dt.id
)
SELECT * FROM dept_tree
ORDER BY path;
```

---

## データ整合性

### 制約

1. **企業-案件の整合性**
   - 案件は必ず企業に紐付く
   - 部署に紐付ける場合は、その部署が企業に属していること

2. **日付の整合性**
   - `assignment_end_date >= assignment_start_date`
   - `contract_end_date >= contract_start_date`

3. **稼働率の妥当性**
   - `workload_percentage` は 0-100 の範囲
   - 同一社員の同時期の稼働率合計が100%を超えないように（アプリケーション側で制御）

4. **階層の循環参照防止**
   - company_departments の parent_id が循環しないように（アプリケーション側で制御）

### トリガー（検討中）

- `updated_at` の自動更新
- 削除時のカスケード設定
- 履歴データの自動アーカイブ

---

## 拡張案

将来的に追加を検討する機能：

### 1. 売上管理
- `project_revenues` テーブル: 案件ごとの売上実績
- 請求書発行履歴

### 2. 工数管理
- `work_logs` テーブル: 日次の作業記録
- 実績工数と予定工数の比較

### 3. スキルマッチング
- 案件に必要なスキルと社員スキルのマッチング機能
- `project_required_skills` テーブル

### 4. コスト管理
- 社員の原価管理
- 案件の収支分析

### 5. ドキュメント管理
- 契約書、設計書などのファイル管理
- `project_documents` テーブル

---

## マイグレーション順序

1. `companies`
2. `company_offices`
3. `company_departments`
4. `company_contacts`
5. `projects`
6. `project_assignments`

各テーブルの外部キー制約は、参照先テーブル作成後に追加する。

---

## 注意事項

- UUID を主キーとして使用することでスケーラビリティを確保
- インデックスは実際の使用パターンに応じて最適化が必要
- 大量データを扱う場合はパーティショニングを検討
- 削除は論理削除（deleted_at）の追加も検討可能
- 履歴データは定期的にアーカイブテーブルへ移動することを推奨

---

**作成日**: 2026-02-02
**バージョン**: 1.0
**更新履歴**: 初版作成

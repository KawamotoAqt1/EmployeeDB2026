# データベース仕様書

**プロジェクト名**: 社員データベース Webアプリケーション (EmployeeDB2026)
**バージョン**: 1.0
**作成日**: 2026-02-22
**データベース**: PostgreSQL 15
**ORM**: Prisma 5.10.0

---

## 目次

1. [データベース概要](#1-データベース概要)
2. [ER図](#2-er図)
3. [Enum定義](#3-enum定義)
4. [テーブル定義 - 社員管理](#4-テーブル定義---社員管理)
5. [テーブル定義 - タグシステム](#5-テーブル定義---タグシステム)
6. [テーブル定義 - 認証](#6-テーブル定義---認証)
7. [テーブル定義 - 企業管理](#7-テーブル定義---企業管理)
8. [テーブル定義 - 案件管理](#8-テーブル定義---案件管理)
9. [リレーション一覧](#9-リレーション一覧)
10. [インデックス定義](#10-インデックス定義)
11. [制約一覧](#11-制約一覧)
12. [カスケード動作](#12-カスケード動作)
13. [データベース接続設定](#13-データベース接続設定)

---

## 1. データベース概要

### 1.1 テーブル一覧

| # | テーブル名 (Prismaモデル) | テーブル名 (DB) | 説明 | フェーズ |
|---|--------------------------|-----------------|------|---------|
| 1 | Employee | employees | 社員マスタ | Phase 1 |
| 2 | TagCategory | tag_categories | タグカテゴリマスタ | Phase 1 |
| 3 | Tag | tags | タグマスタ | Phase 1 |
| 4 | EmployeeSkill | employee_skills | 社員スキル（社員×タグ） | Phase 1 |
| 5 | User | users | 認証ユーザー | Phase 1 |
| 6 | Company | companies | 企業マスタ | Phase 2 |
| 7 | CompanyOffice | company_offices | 企業拠点 | Phase 2 |
| 8 | CompanyDepartment | company_departments | 企業部署（階層構造） | Phase 2 |
| 9 | CompanyContact | company_contacts | 企業担当窓口 | Phase 2 |
| 10 | Project | projects | 案件マスタ | Phase 2 |
| 11 | ProjectAssignment | project_assignments | 案件参画（社員×案件） | Phase 2 |

### 1.2 主キー方針

- 全テーブルの主キーに UUID (v4) を使用
- Prismaのデフォルト: `@default(uuid())`
- 分散環境でのID衝突を回避

### 1.3 共通カラム

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| createdAt | DateTime | 作成日時（自動設定） |
| updatedAt | DateTime | 更新日時（自動更新） |

---

## 2. ER図

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   TagCategory   │     │       Tag        │     │EmployeeSkill│
│─────────────────│     │──────────────────│     │─────────────│
│ id (PK)         │──┐  │ id (PK)          │──┐  │ id (PK)     │
│ code (UQ)       │  └─>│ categoryId (FK)  │  └─>│ tagId (FK)  │
│ name            │     │ name             │     │ employeeId  │──┐
│ parentId (FK)───│──┘  │ sortOrder        │     │ level       │  │
│ sortOrder       │     │ createdAt        │     │ createdAt   │  │
│ children[]      │     └──────────────────┘     └─────────────┘  │
└─────────────────┘                                                │
                                                                   │
┌──────────────────────────────────────────────────────────────────┘
│
│  ┌─────────────────────┐
└─>│      Employee        │
   │─────────────────────│
   │ id (PK)             │
   │ employeeNumber (UQ) │
   │ fullName            │
   │ ...                 │<──────────────────────────┐
   │ skills[]            │                           │
   │ projectAssignments[]│                           │
   └─────────────────────┘                           │
                                                     │
   ┌─────────────────────┐     ┌──────────────────┐  │
   │      Company         │     │     Project       │  │
   │─────────────────────│     │──────────────────│  │
   │ id (PK)             │──┐  │ id (PK)          │  │
   │ code (UQ)           │  │  │ code (UQ)        │  │
   │ name                │  │  │ companyId (FK)   │<─┘
   │ ...                 │  └─>│ departmentId(FK) │     ┌───────────────────┐
   │ offices[]           │     │ ...              │──┐  │ProjectAssignment  │
   │ departments[]       │     │ assignments[]    │  └─>│───────────────────│
   │ contacts[]          │     └──────────────────┘     │ id (PK)           │
   │ projects[]          │                              │ projectId (FK)    │
   └─────────────────────┘                              │ employeeId (FK)   │
        │                                               │ role              │
        │  ┌──────────────────┐                         │ startDate         │
        ├─>│  CompanyOffice    │                         │ endDate           │
        │  │──────────────────│                         │ workload%         │
        │  │ id (PK)          │                         │ status            │
        │  │ companyId (FK)   │                         └───────────────────┘
        │  │ name             │
        │  │ isHeadquarters   │
        │  └──────────────────┘
        │
        │  ┌──────────────────┐
        ├─>│CompanyDepartment │
        │  │──────────────────│
        │  │ id (PK)          │
        │  │ companyId (FK)   │
        │  │ officeId (FK)    │
        │  │ parentId (FK)────│──┘ (自己参照)
        │  │ type             │
        │  │ name             │
        │  └──────────────────┘
        │
        │  ┌──────────────────┐
        └─>│ CompanyContact   │
           │──────────────────│
           │ id (PK)          │
           │ companyId (FK)   │
           │ departmentId(FK) │
           │ name             │
           │ isPrimary        │
           └──────────────────┘
```

---

## 3. Enum定義

### 3.1 Gender（性別）

| 値 | 表示名 |
|----|--------|
| MALE | 男性 |
| FEMALE | 女性 |
| OTHER | その他 |

### 3.2 ContractType（契約形態 - 社員）

| 値 | 表示名 |
|----|--------|
| FULL_TIME | 正社員 |
| CONTRACT | 契約社員 |
| PART_TIME | パートタイム |
| TEMPORARY | 派遣 |
| INTERN | インターン |
| OUTSOURCE | BP（ビジネスパートナー） |

### 3.3 EmployeeStatus（社員ステータス）

| 値 | 表示名 |
|----|--------|
| ACTIVE | 在籍 |
| INACTIVE | 休職 |
| PENDING | 退職（求職） |
| RESIGNED | 退職 |

### 3.4 SkillLevel（スキルレベル）

| 値 | 表示名 | 説明 |
|----|--------|------|
| BEGINNER | 初級 | 基礎知識あり |
| INTERMEDIATE | 中級 | 一人で実務遂行可能 |
| ADVANCED | 上級 | 高度な業務に対応可能 |
| EXPERT | エキスパート | 該当分野の第一人者 |

### 3.5 UserRole（ユーザーロール）

| 値 | 表示名 | 権限 |
|----|--------|------|
| ADMIN | 管理者 | 全機能利用可能 |
| EDITOR | 編集者 | 社員・タグ・企業・案件の管理 |
| VIEWER | 閲覧者 | 閲覧のみ |

### 3.6 CompanyStatus（企業ステータス）

| 値 | 表示名 |
|----|--------|
| ACTIVE | 取引中 |
| INACTIVE | 休止中 |
| TERMINATED | 取引終了 |

### 3.7 DepartmentType（部署タイプ）

| 値 | 表示名 |
|----|--------|
| DIVISION | 事業部 |
| DEPARTMENT | 部 |
| SECTION | 課 |
| UNIT | ユニット |
| OTHER | その他 |

### 3.8 ContractTypeProject（契約形態 - 案件）

| 値 | 表示名 |
|----|--------|
| DISPATCH | 派遣 |
| SES | SES（準委任） |
| CONTRACT | 請負 |

### 3.9 ProjectStatus（案件ステータス）

| 値 | 表示名 |
|----|--------|
| PROPOSAL | 提案中 |
| IN_PROGRESS | 進行中 |
| COMPLETED | 完了 |
| CANCELLED | 中止 |
| ON_HOLD | 保留 |

### 3.10 BillingType（請求タイプ）

| 値 | 表示名 |
|----|--------|
| HOURLY | 時間単価 |
| DAILY | 日単価 |
| MONTHLY | 月単価 |
| FIXED | 固定 |

### 3.11 AssignmentStatus（アサインステータス）

| 値 | 表示名 |
|----|--------|
| SCHEDULED | 予定 |
| IN_PROGRESS | 進行中 |
| COMPLETED | 完了 |

---

## 4. テーブル定義 - 社員管理

### 4.1 employees（社員）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | employee_number | employeeNumber | VARCHAR | NO | - | 社員番号（ユニーク） |
| 3 | employee_unique_number | employeeUniqueNumber | VARCHAR | YES | - | 社員固有番号（ユニーク） |
| 4 | full_name | fullName | VARCHAR | NO | - | 氏名 |
| 5 | full_name_kana | fullNameKana | VARCHAR | YES | - | 氏名カナ |
| 6 | email | email | VARCHAR | YES | - | メールアドレス（ユニーク） |
| 7 | birth_date | birthDate | DATE | YES | - | 生年月日 |
| 8 | gender | gender | ENUM(Gender) | YES | - | 性別 |
| 9 | contract_type | contractType | ENUM(ContractType) | YES | - | 契約形態 |
| 10 | department | department | VARCHAR | YES | - | 部署 |
| 11 | position | position | VARCHAR | YES | - | 役職 |
| 12 | location | location | VARCHAR | YES | - | 勤務地 |
| 13 | country | country | VARCHAR | YES | - | 国 |
| 14 | residence | residence | TEXT | YES | - | 住所 |
| 15 | station | station | VARCHAR | YES | - | 最寄り駅 |
| 16 | hire_date | hireDate | DATE | YES | - | 入社日 |
| 17 | contract_end_date | contractEndDate | DATE | YES | - | 契約終了日 |
| 18 | status | status | ENUM(EmployeeStatus) | NO | ACTIVE | ステータス |
| 19 | remark | remark | TEXT | YES | - | 備考 |
| 20 | photo_url | photoUrl | VARCHAR | YES | - | 写真URL |
| 21 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 22 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**ユニーク制約:**
- `employee_number` (UNIQUE)
- `employee_unique_number` (UNIQUE)
- `email` (UNIQUE)

**リレーション:**
- `skills` → EmployeeSkill[] (1:N)
- `projectAssignments` → ProjectAssignment[] (1:N)

---

## 5. テーブル定義 - タグシステム

### 5.1 tag_categories（タグカテゴリ）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | code | code | VARCHAR | NO | - | カテゴリコード（ユニーク） |
| 3 | name | name | VARCHAR | NO | - | カテゴリ名 |
| 4 | parent_id | parentId | UUID | YES | - | 親カテゴリID（自己参照） |
| 5 | sort_order | sortOrder | INT | NO | 0 | 表示順 |

**ユニーク制約:**
- `code` (UNIQUE)

**リレーション:**
- `parent` → TagCategory? (自己参照、N:1)
- `children` → TagCategory[] (自己参照、1:N)
- `tags` → Tag[] (1:N)

### 5.2 tags（タグ）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | category_id | categoryId | UUID | NO | - | カテゴリID（FK） |
| 3 | name | name | VARCHAR | NO | - | タグ名 |
| 4 | sort_order | sortOrder | INT | NO | 0 | 表示順 |
| 5 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |

**ユニーク制約:**
- `(category_id, name)` (複合ユニーク)

**リレーション:**
- `category` → TagCategory (N:1)
- `employeeSkills` → EmployeeSkill[] (1:N)

### 5.3 employee_skills（社員スキル）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | employee_id | employeeId | UUID | NO | - | 社員ID（FK） |
| 3 | tag_id | tagId | UUID | NO | - | タグID（FK） |
| 4 | level | level | ENUM(SkillLevel) | NO | BEGINNER | スキルレベル |
| 5 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |

**ユニーク制約:**
- `(employee_id, tag_id)` (複合ユニーク: 同一社員に同一タグは1つ)

**リレーション:**
- `employee` → Employee (N:1)
- `tag` → Tag (N:1)

---

## 6. テーブル定義 - 認証

### 6.1 users（ユーザー）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | email | email | VARCHAR | NO | - | メールアドレス（ユニーク） |
| 3 | password_hash | passwordHash | VARCHAR | NO | - | パスワードハッシュ（bcrypt） |
| 4 | role | role | ENUM(UserRole) | NO | VIEWER | ロール |
| 5 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |

**ユニーク制約:**
- `email` (UNIQUE)

---

## 7. テーブル定義 - 企業管理

### 7.1 companies（企業）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | code | code | VARCHAR | NO | - | 企業コード（ユニーク） |
| 3 | name | name | VARCHAR | NO | - | 企業名 |
| 4 | name_kana | nameKana | VARCHAR | YES | - | 企業名フリガナ |
| 5 | postal_code | postalCode | VARCHAR | YES | - | 郵便番号 |
| 6 | address | address | TEXT | YES | - | 住所 |
| 7 | phone | phone | VARCHAR | YES | - | 電話番号 |
| 8 | website | website | VARCHAR | YES | - | Webサイト |
| 9 | industry | industry | VARCHAR | YES | - | 業種 |
| 10 | status | status | ENUM(CompanyStatus) | NO | ACTIVE | ステータス |
| 11 | remark | remark | TEXT | YES | - | 備考 |
| 12 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 13 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**ユニーク制約:**
- `code` (UNIQUE)

**インデックス:**
- `code`
- `name`
- `status`

**リレーション:**
- `offices` → CompanyOffice[] (1:N)
- `departments` → CompanyDepartment[] (1:N)
- `contacts` → CompanyContact[] (1:N)
- `projects` → Project[] (1:N)

### 7.2 company_offices（企業拠点）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | company_id | companyId | UUID | NO | - | 企業ID（FK） |
| 3 | name | name | VARCHAR | NO | - | 拠点名 |
| 4 | postal_code | postalCode | VARCHAR | YES | - | 郵便番号 |
| 5 | address | address | TEXT | YES | - | 住所 |
| 6 | phone | phone | VARCHAR | YES | - | 電話番号 |
| 7 | is_headquarters | isHeadquarters | BOOLEAN | NO | false | 本社フラグ |
| 8 | sort_order | sortOrder | INT | NO | 0 | 表示順 |
| 9 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 10 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**インデックス:**
- `company_id`

**リレーション:**
- `company` → Company (N:1)
- `departments` → CompanyDepartment[] (1:N)

### 7.3 company_departments（企業部署）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | company_id | companyId | UUID | NO | - | 企業ID（FK） |
| 3 | office_id | officeId | UUID | YES | - | 拠点ID（FK） |
| 4 | parent_id | parentId | UUID | YES | - | 親部署ID（自己参照FK） |
| 5 | type | type | ENUM(DepartmentType) | NO | - | 部署タイプ |
| 6 | name | name | VARCHAR | NO | - | 部署名 |
| 7 | sort_order | sortOrder | INT | NO | 0 | 表示順 |
| 8 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 9 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**インデックス:**
- `company_id`
- `parent_id`

**リレーション:**
- `company` → Company (N:1)
- `office` → CompanyOffice? (N:1)
- `parent` → CompanyDepartment? (自己参照、N:1)
- `children` → CompanyDepartment[] (自己参照、1:N)
- `contacts` → CompanyContact[] (1:N)
- `projects` → Project[] (1:N)

**設計ポイント:**
- 自己参照による階層構造: 事業部 → 部 → 課 → ユニット
- `type` フィールドで階層レベルを明示
- 拠点紐付けは任意（拠点削除時に SetNull）

### 7.4 company_contacts（企業担当窓口）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | company_id | companyId | UUID | NO | - | 企業ID（FK） |
| 3 | department_id | departmentId | UUID | YES | - | 部署ID（FK） |
| 4 | name | name | VARCHAR | NO | - | 担当者名 |
| 5 | name_kana | nameKana | VARCHAR | YES | - | 担当者名フリガナ |
| 6 | title | title | VARCHAR | YES | - | 役職 |
| 7 | email | email | VARCHAR | YES | - | メールアドレス |
| 8 | phone | phone | VARCHAR | YES | - | 電話番号 |
| 9 | mobile | mobile | VARCHAR | YES | - | 携帯番号 |
| 10 | is_primary | isPrimary | BOOLEAN | NO | false | 主担当フラグ |
| 11 | remark | remark | TEXT | YES | - | 備考 |
| 12 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 13 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**インデックス:**
- `company_id`
- `email`

**リレーション:**
- `company` → Company (N:1)
- `department` → CompanyDepartment? (N:1)

---

## 8. テーブル定義 - 案件管理

### 8.1 projects（案件）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | company_id | companyId | UUID | NO | - | 企業ID（FK） |
| 3 | department_id | departmentId | UUID | YES | - | 部署ID（FK） |
| 4 | code | code | VARCHAR | NO | - | 案件コード（ユニーク） |
| 5 | name | name | VARCHAR | NO | - | 案件名 |
| 6 | description | description | TEXT | YES | - | 説明 |
| 7 | contract_type | contractType | ENUM(ContractTypeProject) | NO | - | 契約形態 |
| 8 | contract_start_date | contractStartDate | DATE | YES | - | 契約開始日 |
| 9 | contract_end_date | contractEndDate | DATE | YES | - | 契約終了日 |
| 10 | delivery_date | deliveryDate | DATE | YES | - | 納品日 |
| 11 | budget | budget | DECIMAL(15,2) | YES | - | 予算 |
| 12 | unit_price | unitPrice | DECIMAL(15,2) | YES | - | 単価 |
| 13 | status | status | ENUM(ProjectStatus) | NO | PROPOSAL | ステータス |
| 14 | location | location | VARCHAR | YES | - | 勤務地 |
| 15 | remark | remark | TEXT | YES | - | 備考 |
| 16 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 17 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**ユニーク制約:**
- `code` (UNIQUE)

**インデックス:**
- `code`
- `company_id`
- `status`
- `(contract_start_date, contract_end_date)` (複合)

**リレーション:**
- `company` → Company (N:1)
- `department` → CompanyDepartment? (N:1)
- `assignments` → ProjectAssignment[] (1:N)

**金額フィールドの精度:**
- `DECIMAL(15,2)`: 最大 9,999,999,999,999.99
- 通常のビジネス用途に十分な精度

### 8.2 project_assignments（案件参画）

| # | カラム名 | Prismaフィールド | 型 | NULL | デフォルト | 説明 |
|---|---------|-----------------|-----|------|-----------|------|
| 1 | id | id | UUID | NO | uuid() | 主キー |
| 2 | project_id | projectId | UUID | NO | - | 案件ID（FK） |
| 3 | employee_id | employeeId | UUID | NO | - | 社員ID（FK） |
| 4 | role | role | VARCHAR | YES | - | 役割 |
| 5 | assignment_start_date | assignmentStartDate | DATE | NO | - | 参画開始日 |
| 6 | assignment_end_date | assignmentEndDate | DATE | YES | - | 参画終了日 |
| 7 | workload_percentage | workloadPercentage | INT | YES | - | 稼働率（0〜100%） |
| 8 | unit_price | unitPrice | DECIMAL(15,2) | YES | - | 個別単価 |
| 9 | billing_type | billingType | ENUM(BillingType) | YES | - | 請求タイプ |
| 10 | status | status | ENUM(AssignmentStatus) | NO | SCHEDULED | ステータス |
| 11 | remark | remark | TEXT | YES | - | 備考 |
| 12 | created_at | createdAt | TIMESTAMP | NO | now() | 作成日時 |
| 13 | updated_at | updatedAt | TIMESTAMP | NO | auto | 更新日時 |

**インデックス:**
- `project_id`
- `employee_id`
- `(assignment_start_date, assignment_end_date)` (複合)
- `status`

**リレーション:**
- `project` → Project (N:1)
- `employee` → Employee (N:1)

**設計ポイント:**
- 同一社員の同一案件への複数アサイン可能（期間違い）
- `workloadPercentage` で稼働率管理（100% = フルタイム）
- 開始日・終了日で履歴管理

---

## 9. リレーション一覧

### 9.1 1:N リレーション

| 親テーブル | 子テーブル | FK | 説明 |
|-----------|-----------|-----|------|
| Employee | EmployeeSkill | employeeId | 社員のスキル |
| Employee | ProjectAssignment | employeeId | 社員の参画履歴 |
| TagCategory | Tag | categoryId | カテゴリのタグ |
| TagCategory | TagCategory | parentId | 親子カテゴリ（自己参照） |
| Tag | EmployeeSkill | tagId | タグのスキル紐付け |
| Company | CompanyOffice | companyId | 企業の拠点 |
| Company | CompanyDepartment | companyId | 企業の部署 |
| Company | CompanyContact | companyId | 企業の担当窓口 |
| Company | Project | companyId | 企業の案件 |
| CompanyOffice | CompanyDepartment | officeId | 拠点の部署 |
| CompanyDepartment | CompanyDepartment | parentId | 親子部署（自己参照） |
| CompanyDepartment | CompanyContact | departmentId | 部署の担当窓口 |
| CompanyDepartment | Project | departmentId | 部署の案件 |
| Project | ProjectAssignment | projectId | 案件のアサイン |

### 9.2 多対多リレーション（ブリッジテーブル経由）

| テーブルA | テーブルB | ブリッジテーブル | 追加属性 |
|----------|----------|----------------|---------|
| Employee | Tag | EmployeeSkill | level (スキルレベル) |
| Employee | Project | ProjectAssignment | role, dates, workload 等 |

---

## 10. インデックス定義

### 10.1 ユニークインデックス

| テーブル | カラム | 説明 |
|---------|--------|------|
| employees | employee_number | 社員番号 |
| employees | employee_unique_number | 社員固有番号 |
| employees | email | メールアドレス |
| tag_categories | code | カテゴリコード |
| tags | (category_id, name) | カテゴリ内タグ名 |
| employee_skills | (employee_id, tag_id) | 社員タグ組み合わせ |
| users | email | ユーザーメール |
| companies | code | 企業コード |
| projects | code | 案件コード |

### 10.2 非ユニークインデックス

| テーブル | カラム | 用途 |
|---------|--------|------|
| companies | code | コード検索 |
| companies | name | 企業名検索 |
| companies | status | ステータスフィルタ |
| company_offices | company_id | 企業別拠点取得 |
| company_departments | company_id | 企業別部署取得 |
| company_departments | parent_id | 子部署取得 |
| company_contacts | company_id | 企業別担当窓口取得 |
| company_contacts | email | メール検索 |
| projects | code | コード検索 |
| projects | company_id | 企業別案件取得 |
| projects | status | ステータスフィルタ |
| projects | (contract_start_date, contract_end_date) | 期間検索 |
| project_assignments | project_id | 案件別アサイン取得 |
| project_assignments | employee_id | 社員別アサイン取得 |
| project_assignments | (assignment_start_date, assignment_end_date) | 期間検索 |
| project_assignments | status | ステータスフィルタ |

---

## 11. 制約一覧

### 11.1 NOT NULL制約

各テーブルの必須カラムは「テーブル定義」セクションの NULL = NO のカラムを参照。

### 11.2 外部キー制約

| テーブル | FK カラム | 参照先 | ON DELETE |
|---------|----------|--------|-----------|
| tag_categories | parent_id | tag_categories.id | SetNull |
| tags | category_id | tag_categories.id | Cascade |
| employee_skills | employee_id | employees.id | Cascade |
| employee_skills | tag_id | tags.id | Cascade |
| company_offices | company_id | companies.id | Cascade |
| company_departments | company_id | companies.id | Cascade |
| company_departments | office_id | company_offices.id | SetNull |
| company_departments | parent_id | company_departments.id | SetNull |
| company_contacts | company_id | companies.id | Cascade |
| company_contacts | department_id | company_departments.id | SetNull |
| projects | company_id | companies.id | Cascade |
| projects | department_id | company_departments.id | SetNull |
| project_assignments | project_id | projects.id | Cascade |
| project_assignments | employee_id | employees.id | Cascade |

### 11.3 デフォルト値

| テーブル | カラム | デフォルト値 |
|---------|--------|-------------|
| employees | status | ACTIVE |
| employee_skills | level | BEGINNER |
| users | role | VIEWER |
| companies | status | ACTIVE |
| company_offices | isHeadquarters | false |
| company_offices | sortOrder | 0 |
| company_departments | sortOrder | 0 |
| company_contacts | isPrimary | false |
| projects | status | PROPOSAL |
| project_assignments | status | SCHEDULED |
| tag_categories | sortOrder | 0 |
| tags | sortOrder | 0 |

---

## 12. カスケード動作

### 12.1 Cascade Delete（親削除時に子も削除）

| 親削除 | 連鎖削除される子 |
|--------|-----------------|
| Employee 削除 | → EmployeeSkill, ProjectAssignment |
| TagCategory 削除 | → Tag → EmployeeSkill |
| Tag 削除 | → EmployeeSkill |
| Company 削除 | → CompanyOffice, CompanyDepartment, CompanyContact, Project → ProjectAssignment |
| Project 削除 | → ProjectAssignment |

### 12.2 SetNull（親削除時にNULL設定）

| 親削除 | NULL設定されるカラム |
|--------|-------------------|
| TagCategory 削除 | → TagCategory.parentId（子カテゴリの親参照） |
| CompanyOffice 削除 | → CompanyDepartment.officeId |
| CompanyDepartment 削除 | → CompanyDepartment.parentId（子部署の親参照） |
| CompanyDepartment 削除 | → CompanyContact.departmentId |
| CompanyDepartment 削除 | → Project.departmentId |

---

## 13. データベース接続設定

### 13.1 開発環境

```
PostgreSQL 15（Docker Compose）
ホスト: localhost
ポート: 5433（ホスト側）→ 5432（コンテナ側）
データベース名: employee_db
ユーザー: employee_user
パスワード: employee_pass
接続文字列: postgresql://employee_user:employee_pass@localhost:5433/employee_db?schema=public
```

### 13.2 Docker Compose設定

```yaml
services:
  postgres:
    image: postgres:15
    container_name: employee-db-postgres
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: employee_user
      POSTGRES_PASSWORD: employee_pass
      POSTGRES_DB: employee_db
      POSTGRES_HOST_AUTH_METHOD: trust
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
```

### 13.3 マイグレーション管理

- ツール: Prisma Migrate
- マイグレーションファイル: `backend/prisma/migrations/`
- 開発環境: `npx prisma migrate dev`
- 本番環境: `npx prisma migrate deploy`
- スキーマ定義: `backend/prisma/schema.prisma`
- クライアント生成: `npx prisma generate`

### 13.4 シードデータ

- ファイル: `backend/prisma/seed.ts`
- 実行: `npx prisma db seed` または `ts-node prisma/seed.ts`
- 初期管理者: admin@example.com / password123

---

**以上**

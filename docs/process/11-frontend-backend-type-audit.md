# フロントエンド・バックエンド型定義整合性監査レポート

**作成日**: 2026-02-04
**対象ファイル**:
- `frontend/src/types/index.ts`
- `backend/src/routes/*.ts`
- `backend/prisma/schema.prisma`

---

## 目次

1. [概要](#概要)
2. [共通レスポンス形式](#共通レスポンス形式)
3. [Employee（社員）型](#employee社員型)
4. [Company（企業）型](#company企業型)
5. [Project（案件）型](#project案件型)
6. [ProjectAssignment（案件アサイン）型](#projectassignment案件アサイン型)
7. [Tag（タグ）型](#tagタグ型)
8. [TagCategory（タグカテゴリ）型](#tagcategoryタグカテゴリ型)
9. [User（ユーザー）型](#userユーザー型)
10. [CompanyOffice（企業拠点）型](#companyoffice企業拠点型)
11. [CompanyDepartment（企業部署）型](#companydepartment企業部署型)
12. [CompanyContact（企業担当窓口）型](#companycontact企業担当窓口型)
13. [Pagination（ページネーション）型](#paginationページネーション型)
14. [Auth（認証）型](#auth認証型)
15. [不整合一覧サマリー](#不整合一覧サマリー)
16. [修正推奨事項](#修正推奨事項)

---

## 概要

本レポートは、フロントエンドの型定義（`frontend/src/types/index.ts`）と、バックエンドのAPI実装（`backend/src/routes/*.ts`）およびデータベーススキーマ（`backend/prisma/schema.prisma`）間の整合性を調査したものです。

### 調査結果サマリー

| カテゴリ | 不整合数 | 重要度 |
|----------|----------|--------|
| フィールド名の違い | 3 | 中 |
| 型の違い | 6 | 高 |
| 欠落フィールド（Frontend） | 12 | 高 |
| 欠落フィールド（Backend） | 0 | - |
| ページネーション形式 | 1 | 高 |
| レスポンスラッパー形式 | 1 | 中 |

---

## 共通レスポンス形式

### バックエンドのレスポンス形式

全APIは以下の共通形式でレスポンスを返します:

```typescript
// 成功時
{
  success: true,
  data: T | T[],
  pagination?: { page, limit, total, totalPages }
}

// エラー時
{
  success: false,
  error: { code: string, message: string }
}
```

### フロントエンドの期待形式

`frontend/src/types/index.ts`:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

interface PaginationInfo {
  currentPage: number;      // Backend: page
  totalPages: number;       // OK
  totalItems: number;       // Backend: total
  itemsPerPage: number;     // Backend: limit
  hasNextPage: boolean;     // Backend: なし（計算で導出）
  hasPreviousPage: boolean; // Backend: なし（計算で導出）
}
```

### 不整合 #1: ページネーション形式

| 項目 | フロントエンド | バックエンド | 状況 |
|------|---------------|--------------|------|
| `currentPage` | `currentPage` | `page` | **名前違い** |
| `totalItems` | `totalItems` | `total` | **名前違い** |
| `itemsPerPage` | `itemsPerPage` | `limit` | **名前違い** |
| `hasNextPage` | 期待 | なし | **フック内で計算対応済み** |
| `hasPreviousPage` | 期待 | なし | **フック内で計算対応済み** |

**対応状況**: `useEmployees`, `useCompanies`, `useProjects` のフック内で変換処理を実施済み

---

## Employee（社員）型

### フロントエンド定義

```typescript
interface Employee {
  id: string;
  employeeNumber: string;
  employeeUniqueNumber?: string;
  fullName: string;
  fullNameKana?: string;
  email?: string;
  birthDate?: string;
  gender?: Gender;
  contractType?: ContractType;
  department?: string;
  position?: string;
  location?: string;
  country?: string;
  residence?: string;
  station?: string;
  hireDate?: string;
  contractEndDate?: string;
  status: EmployeeStatus;
  remark?: string;
  photoUrl?: string;
  skills?: EmployeeSkill[];
  assignments?: ProjectAssignment[];
  createdAt: string;
  updatedAt: string;
}
```

### Prismaスキーマ

```prisma
model Employee {
  id                    String   @id @default(uuid())
  employeeNumber        String   @unique
  employeeUniqueNumber  String?  @unique
  fullName              String
  fullNameKana          String?
  email                 String?  @unique
  birthDate             DateTime?
  gender                Gender?
  contractType          ContractType?
  department            String?
  position              String?
  location              String?
  country               String?
  residence             String?
  station               String?
  hireDate              DateTime?
  contractEndDate       DateTime?
  status                EmployeeStatus @default(ACTIVE)
  remark                String?
  photoUrl              String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  skills                EmployeeSkill[]
  projectAssignments    ProjectAssignment[]  // ← フロントエンドは assignments
}
```

### バックエンドレスポンス

`GET /api/employees/:id`:
- Prismaの`include`で`skills`を含む
- `projectAssignments`は含まれていない（別エンドポイント）

### 不整合

| 項目 | フロントエンド | バックエンド/Prisma | 状況 |
|------|---------------|---------------------|------|
| 日付型 | `string` | `DateTime` (ISO文字列として返却) | **OK** (JSON変換で文字列化) |
| リレーション名 | `assignments` | `projectAssignments` | **不一致** |

**影響**: フロントエンドで`employee.assignments`を参照しても、バックエンドは`projectAssignments`を返す。現在、社員詳細では`/employees/:id/assignments`エンドポイントを使用しているため実害なし。

---

## Company（企業）型

### フロントエンド定義

```typescript
interface Company {
  id: string;
  code: string;
  name: string;
  nameKana?: string;
  industry?: string;
  status: CompanyStatus;
  website?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  offices?: CompanyOffice[];
  departments?: CompanyDepartment[];
  contacts?: CompanyContact[];
}
```

### Prismaスキーマ

```prisma
model Company {
  id          String
  code        String          @unique
  name        String
  nameKana    String?
  postalCode  String?         // ← フロントエンドに欠落
  address     String?         // ← フロントエンドに欠落
  phone       String?         // ← フロントエンドに欠落
  website     String?
  industry    String?
  status      CompanyStatus
  remark      String?
  createdAt   DateTime
  updatedAt   DateTime
  offices     CompanyOffice[]
  departments CompanyDepartment[]
  contacts    CompanyContact[]
  projects    Project[]       // ← フロントエンドに欠落
}
```

### 不整合 #2: Company型のフィールド欠落

| フィールド | フロントエンド | Prisma/バックエンド | 状況 |
|------------|---------------|---------------------|------|
| `postalCode` | **なし** | あり | **欠落** |
| `address` | **なし** | あり | **欠落** |
| `phone` | **なし** | あり | **欠落** |
| `projects` | **なし** | あり（リレーション） | **欠落** |

### バックエンドレスポンス追加フィールド

一覧取得時:
```typescript
{
  ...company,
  _count: {
    offices: number,
    departments: number,
    contacts: number,
    projects: number
  }
}
```

**不整合 #3**: フロントエンドの`Company`型に`_count`フィールドが定義されていない。

---

## Project（案件）型

### フロントエンド定義

```typescript
interface Project {
  id: string;
  code: string;
  companyId: string;
  company?: Company;
  departmentId?: string;
  department?: CompanyDepartment;
  name: string;
  description?: string;
  status: ProjectStatus;
  contractType: ContractTypeProject;
  contractStartDate?: string;
  contractEndDate?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: ProjectAssignment[];
}
```

### Prismaスキーマ

```prisma
model Project {
  id                  String
  companyId           String
  departmentId        String?
  code                String             @unique
  name                String
  description         String?
  contractType        ContractTypeProject
  contractStartDate   DateTime?
  contractEndDate     DateTime?
  deliveryDate        DateTime?         // ← フロントエンドに欠落
  budget              Decimal?          // ← フロントエンドに欠落
  unitPrice           Decimal?          // ← フロントエンドに欠落
  status              ProjectStatus
  location            String?           // ← フロントエンドに欠落
  remark              String?
  createdAt           DateTime
  updatedAt           DateTime
  company             Company
  department          CompanyDepartment?
  assignments         ProjectAssignment[]
}
```

### 不整合 #4: Project型のフィールド欠落

| フィールド | フロントエンド | Prisma/バックエンド | 状況 |
|------------|---------------|---------------------|------|
| `deliveryDate` | **なし** | `DateTime?` | **欠落** |
| `budget` | **なし** | `Decimal?` | **欠落** |
| `unitPrice` | **なし** | `Decimal?` | **欠落** |
| `location` | **なし** | `String?` | **欠落** |

---

## ProjectAssignment（案件アサイン）型

### フロントエンド定義

```typescript
interface ProjectAssignment {
  id: string;
  projectId: string;
  employeeId: string;
  project?: Project;
  employee?: Employee;
  startDate: string;            // ← 名前違い
  endDate?: string;             // ← 名前違い
  role?: string;
  workloadPercentage?: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Prismaスキーマ

```prisma
model ProjectAssignment {
  id                    String
  projectId             String
  employeeId            String
  role                  String?
  assignmentStartDate   DateTime     // ← フロントエンド: startDate
  assignmentEndDate     DateTime?    // ← フロントエンド: endDate
  workloadPercentage    Int?
  unitPrice             Decimal?     // ← フロントエンドに欠落
  billingType           BillingType? // ← フロントエンドに欠落
  status                AssignmentStatus // ← フロントエンドに欠落
  remark                String?
  createdAt             DateTime
  updatedAt             DateTime
  project               Project
  employee              Employee
}
```

### 不整合 #5: ProjectAssignment型のフィールド名・欠落

| フィールド | フロントエンド | Prisma/バックエンド | 状況 |
|------------|---------------|---------------------|------|
| 開始日 | `startDate` | `assignmentStartDate` | **名前違い（重大）** |
| 終了日 | `endDate` | `assignmentEndDate` | **名前違い（重大）** |
| `unitPrice` | **なし** | `Decimal?` | **欠落** |
| `billingType` | **なし** | `BillingType?` | **欠落** |
| `status` | **なし** | `AssignmentStatus` | **欠落** |

### 関連するリクエスト型の不整合

`CreateProjectAssignmentRequest`:

```typescript
// フロントエンド
interface CreateProjectAssignmentRequest {
  projectId: string;
  employeeId: string;
  assignmentStartDate: string;  // OK
  assignmentEndDate?: string;   // OK
  role?: string;
  workloadPercentage?: number;
  remark?: string;
}
```

リクエスト型は正しいが、**レスポンスの型が不一致**。

---

## Tag（タグ）型

### フロントエンド定義

```typescript
interface Tag {
  id: string;
  name: string;
  categoryId: string;
  category?: TagCategory;
  sortOrder: number;
  createdAt: string;
}
```

### Prismaスキーマ

```prisma
model Tag {
  id          String
  categoryId  String
  name        String
  sortOrder   Int
  createdAt   DateTime
  category    TagCategory
  employeeSkills EmployeeSkill[]  // ← フロントエンドに欠落
}
```

### 整合性

**OK** - 主要フィールドは一致。`employeeSkills`リレーションはフロントエンドでは不要。

---

## TagCategory（タグカテゴリ）型

### フロントエンド定義

```typescript
interface TagCategory {
  id: string;
  code: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  children?: TagCategory[];
  tags?: Tag[];
}
```

### Prismaスキーマ

```prisma
model TagCategory {
  id          String
  code        String   @unique
  name        String
  parentId    String?
  sortOrder   Int
  createdAt   DateTime
  parent      TagCategory?
  children    TagCategory[]
  tags        Tag[]
}
```

### 整合性

**OK** - 完全一致。

---

## User（ユーザー）型

### フロントエンド定義

```typescript
interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
```

### Prismaスキーマ

```prisma
model User {
  id            String
  email         String   @unique
  passwordHash  String   // APIでは返却しない
  role          UserRole
  createdAt     DateTime
}
```

### バックエンドレスポンス

```typescript
{
  id: true,
  email: true,
  role: true,
  createdAt: true,
}
```

### 整合性

**OK** - `passwordHash`はセキュリティ上返却しないため、フロントエンドには不要。

---

## CompanyOffice（企業拠点）型

### フロントエンド定義

```typescript
interface CompanyOffice {
  id: string;
  companyId: string;
  name: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  isHeadquarters: boolean;
  sortOrder: number;
  createdAt: string;
}
```

### Prismaスキーマ

```prisma
model CompanyOffice {
  id              String
  companyId       String
  name            String
  postalCode      String?
  address         String?
  phone           String?
  isHeadquarters  Boolean
  sortOrder       Int
  createdAt       DateTime
  updatedAt       DateTime    // ← フロントエンドに欠落
  company         Company
  departments     CompanyDepartment[]
}
```

### 不整合 #6: CompanyOffice型のフィールド欠落

| フィールド | フロントエンド | Prisma/バックエンド | 状況 |
|------------|---------------|---------------------|------|
| `updatedAt` | **なし** | `DateTime` | **欠落** |

### バックエンドレスポンス追加フィールド

```typescript
{
  ...office,
  _count: {
    departments: number
  }
}
```

**不整合**: `_count`がフロントエンド型に定義されていない。

---

## CompanyDepartment（企業部署）型

### フロントエンド定義

```typescript
interface CompanyDepartment {
  id: string;
  companyId: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
  children?: CompanyDepartment[];
}
```

### Prismaスキーマ

```prisma
model CompanyDepartment {
  id          String
  companyId   String
  officeId    String?             // ← フロントエンドに欠落
  parentId    String?
  type        DepartmentType      // ← フロントエンドに欠落
  name        String
  sortOrder   Int
  createdAt   DateTime
  updatedAt   DateTime            // ← フロントエンドに欠落
  company     Company
  office      CompanyOffice?
  parent      CompanyDepartment?
  children    CompanyDepartment[]
  contacts    CompanyContact[]
  projects    Project[]
}
```

### 不整合 #7: CompanyDepartment型のフィールド欠落

| フィールド | フロントエンド | Prisma/バックエンド | 状況 |
|------------|---------------|---------------------|------|
| `officeId` | **なし** | `String?` | **欠落** |
| `type` | **なし** | `DepartmentType` | **欠落（重要）** |
| `updatedAt` | **なし** | `DateTime` | **欠落** |

### DepartmentType Enum

バックエンドに存在するがフロントエンドに未定義:

```typescript
enum DepartmentType {
  DIVISION    // 事業部
  DEPARTMENT  // 部
  SECTION     // 課
  UNIT        // 係
  OTHER       // その他
}
```

---

## CompanyContact（企業担当窓口）型

### フロントエンド定義

```typescript
interface CompanyContact {
  id: string;
  companyId: string;
  departmentId?: string;
  name: string;
  nameKana?: string;
  title?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
  remark?: string;
  sortOrder: number;
  createdAt: string;
  department?: CompanyDepartment;
}
```

### Prismaスキーマ

```prisma
model CompanyContact {
  id            String
  companyId     String
  departmentId  String?
  name          String
  nameKana      String?
  title         String?
  email         String?
  phone         String?
  mobile        String?
  isPrimary     Boolean
  remark        String?
  createdAt     DateTime
  updatedAt     DateTime    // ← フロントエンドに欠落
  company       Company
  department    CompanyDepartment?
}
```

### 不整合 #8: CompanyContact型のフィールド欠落

| フィールド | フロントエンド | Prisma/バックエンド | 状況 |
|------------|---------------|---------------------|------|
| `sortOrder` | **あり** | **なし** | **フロントエンドに余分** |
| `updatedAt` | **なし** | `DateTime` | **欠落** |

**注意**: フロントエンドの`sortOrder`はPrismaスキーマに存在しない。

---

## EmployeeSkill（従業員スキル）型

### フロントエンド定義

```typescript
interface EmployeeSkill {
  id: string;
  employeeId: string;
  tagId: string;
  tag?: Tag;
  level: SkillLevel;
  createdAt: string;
}
```

### Prismaスキーマ

```prisma
model EmployeeSkill {
  id          String
  employeeId  String
  tagId       String
  level       SkillLevel
  createdAt   DateTime
  employee    Employee
  tag         Tag
}
```

### 整合性

**OK** - 完全一致。

---

## Auth（認証）型

### フロントエンド定義

```typescript
interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

### バックエンドレスポンス (`POST /api/auth/login`)

```typescript
{
  success: true,
  data: {
    token: string,     // ← フロントエンド: accessToken
    user: {
      id: string,
      email: string,
      role: string
    }
  }
}
```

### 不整合 #9: Auth型の違い

| フィールド | フロントエンド | バックエンド | 状況 |
|------------|---------------|--------------|------|
| トークンフィールド名 | `accessToken` | `token` | **名前違い** |
| `refreshToken` | 期待 | **なし** | **欠落** |
| `expiresIn` | 期待 | **なし** | **欠落** |

**注意**: 現在のバックエンドはリフレッシュトークンを実装していない。

---

## 不整合一覧サマリー

### 重大な不整合（修正必須）

| # | 型 | 問題 | 影響度 |
|---|-----|------|--------|
| 1 | `ProjectAssignment` | `startDate`/`endDate` vs `assignmentStartDate`/`assignmentEndDate` | **高** |
| 2 | `ProjectAssignment` | `status`, `billingType`, `unitPrice` 欠落 | **高** |
| 3 | `Project` | `deliveryDate`, `budget`, `unitPrice`, `location` 欠落 | **中** |
| 4 | `Company` | `postalCode`, `address`, `phone` 欠落 | **中** |
| 5 | `CompanyDepartment` | `type`, `officeId` 欠落 | **高** |
| 6 | `AuthResponse` | `token` vs `accessToken`, `refreshToken`/`expiresIn` 欠落 | **中** |

### 軽微な不整合（修正推奨）

| # | 型 | 問題 | 影響度 |
|---|-----|------|--------|
| 7 | 各型 | `updatedAt` 欠落（CompanyOffice, CompanyDepartment, CompanyContact） | **低** |
| 8 | `CompanyContact` | `sortOrder` がPrismaに存在しない | **低** |
| 9 | `Employee` | `assignments` vs `projectAssignments` リレーション名 | **低** |
| 10 | 一覧レスポンス | `_count` フィールドがフロントエンド型に未定義 | **低** |

### 欠落しているEnum型（フロントエンド）

| Enum | 用途 | 定義場所 |
|------|------|----------|
| `DepartmentType` | 部署タイプ | Prismaのみ |
| `BillingType` | 請求形態 | Prismaのみ |
| `AssignmentStatus` | 参画ステータス | Prismaのみ |

---

## 修正推奨事項

### 優先度: 高

1. **`ProjectAssignment`型の修正**
   ```typescript
   interface ProjectAssignment {
     id: string;
     projectId: string;
     employeeId: string;
     project?: Project;
     employee?: Employee;
     assignmentStartDate: string;    // 修正
     assignmentEndDate?: string;     // 修正
     role?: string;
     workloadPercentage?: number;
     unitPrice?: number;             // 追加
     billingType?: BillingType;      // 追加
     status: AssignmentStatus;       // 追加
     remark?: string;
     createdAt: string;
     updatedAt: string;
   }
   ```

2. **欠落Enumの追加**
   ```typescript
   export type DepartmentType = 'DIVISION' | 'DEPARTMENT' | 'SECTION' | 'UNIT' | 'OTHER';
   export const DepartmentTypeLabels: Record<DepartmentType, string> = {
     DIVISION: '事業部',
     DEPARTMENT: '部',
     SECTION: '課',
     UNIT: '係',
     OTHER: 'その他',
   };

   export type BillingType = 'HOURLY' | 'DAILY' | 'MONTHLY' | 'FIXED';
   export const BillingTypeLabels: Record<BillingType, string> = {
     HOURLY: '時給',
     DAILY: '日給',
     MONTHLY: '月給',
     FIXED: '固定額',
   };

   export type AssignmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
   export const AssignmentStatusLabels: Record<AssignmentStatus, string> = {
     SCHEDULED: '予定',
     IN_PROGRESS: '参画中',
     COMPLETED: '終了',
   };
   ```

3. **`CompanyDepartment`型の修正**
   ```typescript
   interface CompanyDepartment {
     id: string;
     companyId: string;
     officeId?: string;              // 追加
     name: string;
     parentId?: string;
     type: DepartmentType;           // 追加
     sortOrder: number;
     createdAt: string;
     updatedAt: string;              // 追加
     children?: CompanyDepartment[];
     office?: CompanyOffice;         // 追加
   }
   ```

### 優先度: 中

4. **`Project`型の修正**
   ```typescript
   interface Project {
     // ... 既存フィールド
     deliveryDate?: string;          // 追加
     budget?: number;                // 追加
     unitPrice?: number;             // 追加
     location?: string;              // 追加
   }
   ```

5. **`Company`型の修正**
   ```typescript
   interface Company {
     // ... 既存フィールド
     postalCode?: string;            // 追加
     address?: string;               // 追加
     phone?: string;                 // 追加
     projects?: Project[];           // 追加
   }
   ```

### 優先度: 低

6. **`_count`型の追加**
   ```typescript
   interface CompanyWithCount extends Company {
     _count?: {
       offices: number;
       departments: number;
       contacts: number;
       projects: number;
     };
   }
   ```

7. **各型に`updatedAt`を追加**

---

## 付録: APIフック対応状況

| フック | ページネーション変換 | 型整合性 |
|--------|---------------------|----------|
| `useEmployees` | 対応済み | 部分対応 |
| `useCompanies` | 対応済み | 部分対応 |
| `useProjects` | 対応済み | 部分対応 |
| `useUsers` | 未対応（rawレスポンス返却） | OK |
| `useTags` | 特殊処理あり | OK |

---

**レポート作成**: Claude Code (claude-opus-4-5-20251101)
**最終更新**: 2026-02-04

# Prisma-Zod スキーマ整合性監査レポート

**監査日**: 2026-02-04
**対象ファイル**:
- `backend/prisma/schema.prisma`
- `backend/src/routes/*.ts`

---

## 概要

本レポートは、PrismaスキーマとZodバリデーションスキーマの整合性を検証した結果をまとめたものです。

### 監査対象モデル一覧

| # | Prismaモデル | 対応Zodスキーマ | ファイル |
|---|-------------|----------------|---------|
| 1 | Employee | employeeSchema, employeeListQuerySchema | employees.ts |
| 2 | TagCategory | categorySchema | tags.ts |
| 3 | Tag | tagSchema | tags.ts |
| 4 | EmployeeSkill | addSkillSchema | employees.ts |
| 5 | User | createUserSchema, updateUserSchema, loginSchema | users.ts, auth.ts |
| 6 | Company | companySchema, companyCreateSchema | companies.ts |
| 7 | CompanyOffice | officeSchema | companies.ts |
| 8 | CompanyDepartment | departmentSchema | companies.ts |
| 9 | CompanyContact | contactSchema | companies.ts |
| 10 | Project | projectSchema, projectUpdateSchema | projects.ts |
| 11 | ProjectAssignment | assignmentSchema, assignmentUpdateSchema | projects.ts |

---

## モデル: Employee

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| employeeNumber | String (VARCHAR 20) | Yes | - |
| employeeUniqueNumber | String (VARCHAR 50) | No | - |
| fullName | String (VARCHAR 100) | Yes | - |
| fullNameKana | String (VARCHAR 100) | No | - |
| email | String (VARCHAR 255) | No | unique |
| birthDate | DateTime (Date) | No | - |
| gender | Gender (enum) | No | - |
| contractType | ContractType (enum) | No | - |
| department | String (VARCHAR 100) | No | - |
| position | String (VARCHAR 100) | No | - |
| location | String (VARCHAR 100) | No | - |
| country | String (VARCHAR 50) | No | - |
| residence | String (VARCHAR 100) | No | - |
| station | String (VARCHAR 100) | No | - |
| hireDate | DateTime (Date) | No | - |
| contractEndDate | DateTime (Date) | No | - |
| status | EmployeeStatus (enum) | Yes | ACTIVE |
| remark | String (Text) | No | - |
| photoUrl | String (VARCHAR 500) | No | - |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (employeeSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| employeeNumber | string.min(1).max(20) | Yes | - |
| employeeUniqueNumber | string.max(50) | No | nullable |
| fullName | string.min(1).max(100) | Yes | - |
| fullNameKana | string.max(100) | No | nullable |
| email | string.email() | No | nullable |
| birthDate | string | No | nullable, 手動Date変換 |
| gender | enum['MALE','FEMALE','OTHER'] | No | nullable |
| contractType | enum[6値] | No | nullable |
| department | string.max(100) | No | nullable |
| position | string.max(100) | No | nullable |
| location | string.max(100) | No | nullable |
| country | string.max(50) | No | nullable |
| residence | string.max(100) | No | nullable |
| station | string.max(100) | No | nullable |
| hireDate | string | No | nullable, 手動Date変換 |
| contractEndDate | string | No | nullable, 手動Date変換 |
| status | enum['ACTIVE','INACTIVE','RESIGNED','PENDING'] | No | default('ACTIVE') |
| remark | string | No | nullable |
| photoUrl | string.max(500) | No | nullable |

### 不整合

1. **id**: Zodスキーマに含まれていない（自動生成のため問題なし）
2. **createdAt/updatedAt**: Zodスキーマに含まれていない（自動生成のため問題なし）
3. **birthDate/hireDate/contractEndDate**: Prismaは`DateTime`だが、Zodは`string`で受け取り、手動変換している（意図的な設計）

---

## モデル: TagCategory

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| code | String (VARCHAR 50) | Yes | unique |
| name | String (VARCHAR 100) | Yes | - |
| parentId | String (UUID) | No | - |
| sortOrder | Int | Yes | 0 |
| createdAt | DateTime | Yes | now() |

### Zodスキーマ (categorySchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| code | string.min(1).max(50) | Yes | - |
| name | string.min(1).max(100) | Yes | - |
| parentId | string.uuid() | No | nullable |
| sortOrder | number.int() | No | default(0) |

### 不整合

- **整合性OK**: フィールド定義は適切に一致している

---

## モデル: Tag

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| categoryId | String (UUID) | Yes | - |
| name | String (VARCHAR 100) | Yes | - |
| sortOrder | Int | Yes | 0 |
| createdAt | DateTime | Yes | now() |

### Zodスキーマ (tagSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| categoryId | string.uuid() | Yes | - |
| name | string.min(1).max(100) | Yes | - |
| sortOrder | number.int() | No | default(0) |

### 不整合

- **整合性OK**: フィールド定義は適切に一致している

---

## モデル: EmployeeSkill

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| employeeId | String (UUID) | Yes | - |
| tagId | String (UUID) | Yes | - |
| level | SkillLevel (enum) | Yes | BEGINNER |
| createdAt | DateTime | Yes | now() |

### Zodスキーマ (addSkillSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| tagId | string.uuid() | Yes | - |
| level | enum['BEGINNER','INTERMEDIATE','ADVANCED','EXPERT'] | No | default('BEGINNER') |

### 不整合

1. **employeeId**: Zodスキーマに含まれていない（URLパラメータから取得するため問題なし）

---

## モデル: User

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| email | String (VARCHAR 255) | Yes | unique |
| passwordHash | String (VARCHAR 255) | Yes | - |
| role | UserRole (enum) | Yes | VIEWER |
| createdAt | DateTime | Yes | now() |

### Zodスキーマ (createUserSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| email | string.email() | Yes | - |
| password | string.min(6) | Yes | bcrypt hash後にpasswordHashへ |
| role | enum['ADMIN','EDITOR','VIEWER'] | No | default('VIEWER') |

### Zodスキーマ (updateUserSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| email | string.email() | No | - |
| password | string.min(6) | No | bcrypt hash後にpasswordHashへ |
| role | enum['ADMIN','EDITOR','VIEWER'] | No | - |

### Zodスキーマ (loginSchema - auth.ts)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| email | string.email() | Yes | - |
| password | string.min(1) | Yes | - |

### 不整合

1. **password vs passwordHash**: Zodは`password`を受け取り、bcryptでハッシュ化して`passwordHash`としてDBに保存（意図的な設計）
2. **loginSchema のpassword制約**: `min(1)`だが、createUserSchemaは`min(6)` - ログイン時は空でなければOKという設計

---

## モデル: Company

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| code | String (VARCHAR 50) | Yes | unique |
| name | String (VARCHAR 200) | Yes | - |
| nameKana | String (VARCHAR 200) | No | - |
| postalCode | String (VARCHAR 10) | No | - |
| address | String (Text) | No | - |
| phone | String (VARCHAR 20) | No | - |
| website | String (VARCHAR 500) | No | - |
| industry | String (VARCHAR 100) | No | - |
| status | CompanyStatus (enum) | Yes | ACTIVE |
| remark | String (Text) | No | - |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (companySchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| code | string.min(1).max(50) | Yes | - |
| name | string.min(1).max(200) | Yes | - |
| nameKana | string.max(200) | No | nullable |
| postalCode | string.max(10) | No | nullable |
| address | string | No | nullable |
| phone | string.max(20) | No | nullable |
| website | string.max(500) | No | nullable, 空文字はnullに変換 |
| industry | string.max(100) | No | nullable |
| status | enum['ACTIVE','INACTIVE','TERMINATED'] | No | default('ACTIVE') |
| remark | string | No | nullable |

### 不整合

- **整合性OK**: フィールド定義は適切に一致している

---

## モデル: CompanyOffice

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| companyId | String (UUID) | Yes | - |
| name | String (VARCHAR 200) | Yes | - |
| postalCode | String (VARCHAR 10) | No | - |
| address | String (Text) | No | - |
| phone | String (VARCHAR 20) | No | - |
| isHeadquarters | Boolean | Yes | false |
| sortOrder | Int | Yes | 0 |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (officeSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| name | string.min(1).max(200) | Yes | - |
| postalCode | string.max(10) | No | nullable |
| address | string | No | nullable |
| phone | string.max(20) | No | nullable |
| isHeadquarters | boolean | No | default(false) |
| sortOrder | number.int() | No | default(0) |

### 不整合

1. **companyId**: Zodスキーマに含まれていない（URLパラメータから取得するため問題なし）

---

## モデル: CompanyDepartment

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| companyId | String (UUID) | Yes | - |
| officeId | String (UUID) | No | - |
| parentId | String (UUID) | No | - |
| type | DepartmentType (enum) | Yes | - |
| name | String (VARCHAR 200) | Yes | - |
| sortOrder | Int | Yes | 0 |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (departmentSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| officeId | string.uuid() | No | nullable |
| parentId | string.uuid() | No | nullable |
| type | enum['DIVISION','DEPARTMENT','SECTION','UNIT','OTHER'] | Yes | - |
| name | string.min(1).max(200) | Yes | - |
| sortOrder | number.int() | No | default(0) |

### 不整合

1. **companyId**: Zodスキーマに含まれていない（URLパラメータから取得するため問題なし）

---

## モデル: CompanyContact

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| companyId | String (UUID) | Yes | - |
| departmentId | String (UUID) | No | - |
| name | String (VARCHAR 100) | Yes | - |
| nameKana | String (VARCHAR 100) | No | - |
| title | String (VARCHAR 100) | No | - |
| email | String (VARCHAR 255) | No | - |
| phone | String (VARCHAR 20) | No | - |
| mobile | String (VARCHAR 20) | No | - |
| isPrimary | Boolean | Yes | false |
| remark | String (Text) | No | - |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (contactSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| departmentId | string.uuid() | No | nullable |
| name | string.min(1).max(100) | Yes | - |
| nameKana | string.max(100) | No | nullable |
| title | string.max(100) | No | nullable |
| email | string.email().max(255) | No | nullable, 空文字許可 |
| phone | string.max(20) | No | nullable |
| mobile | string.max(20) | No | nullable |
| isPrimary | boolean | No | default(false) |
| remark | string | No | nullable |

### 不整合

1. **companyId**: Zodスキーマに含まれていない（URLパラメータから取得するため問題なし）

---

## モデル: Project

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| companyId | String (UUID) | Yes | - |
| departmentId | String (UUID) | No | - |
| code | String (VARCHAR 50) | Yes | unique |
| name | String (VARCHAR 200) | Yes | - |
| description | String (Text) | No | - |
| contractType | ContractTypeProject (enum) | Yes | - |
| contractStartDate | DateTime (Date) | No | - |
| contractEndDate | DateTime (Date) | No | - |
| deliveryDate | DateTime (Date) | No | - |
| budget | Decimal (15,2) | No | - |
| unitPrice | Decimal (15,2) | No | - |
| status | ProjectStatus (enum) | Yes | PROPOSAL |
| location | String (VARCHAR 200) | No | - |
| remark | String (Text) | No | - |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (projectSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| code | string.min(1).max(50) | Yes | - |
| name | string.min(1).max(200) | Yes | - |
| description | string | No | nullable |
| companyId | string.uuid() | Yes | - |
| departmentId | string.uuid() | No | nullable |
| contractType | enum['DISPATCH','SES','CONTRACT'] | Yes | - |
| contractStartDate | string | No | nullable, 手動Date変換 |
| contractEndDate | string | No | nullable, 手動Date変換 |
| deliveryDate | string | No | nullable, 手動Date変換 |
| budget | number | No | nullable |
| unitPrice | number | No | nullable |
| status | enum[5値] | No | default('PROPOSAL') |
| location | string.max(200) | No | nullable |
| remark | string | No | nullable |

### 不整合

1. **budget/unitPrice**: PrismaはDecimal(15,2)だが、Zodはnumber - JavaScriptでは精度の問題が発生する可能性がある
   - **推奨対処**: 金額系フィールドには`z.string().regex(/^\d+(\.\d{1,2})?$/)` または `z.number().multipleOf(0.01)` を使用検討

---

## モデル: ProjectAssignment

### Prismaフィールド

| フィールド | 型 | 必須 | デフォルト |
|-----------|-----|------|-----------|
| id | String (UUID) | Yes | uuid() |
| projectId | String (UUID) | Yes | - |
| employeeId | String (UUID) | Yes | - |
| role | String (VARCHAR 100) | No | - |
| assignmentStartDate | DateTime (Date) | Yes | - |
| assignmentEndDate | DateTime (Date) | No | - |
| workloadPercentage | Int | No | - |
| unitPrice | Decimal (15,2) | No | - |
| billingType | BillingType (enum) | No | - |
| status | AssignmentStatus (enum) | Yes | SCHEDULED |
| remark | String (Text) | No | - |
| createdAt | DateTime | Yes | now() |
| updatedAt | DateTime | Yes | @updatedAt |

### Zodスキーマ (assignmentSchema)

| フィールド | 型 | 必須 | 変換 |
|-----------|-----|------|------|
| employeeId | string.uuid() | Yes | - |
| role | string.max(100) | No | nullable |
| assignmentStartDate | string | Yes | 手動Date変換 |
| assignmentEndDate | string | No | nullable, 手動Date変換 |
| workloadPercentage | number.int().min(0).max(100) | No | nullable |
| unitPrice | number | No | nullable |
| billingType | enum['HOURLY','DAILY','MONTHLY','FIXED'] | No | nullable |
| status | enum['SCHEDULED','IN_PROGRESS','COMPLETED'] | No | default('SCHEDULED') |
| remark | string | No | nullable |

### 不整合

1. **projectId**: Zodスキーマに含まれていない（URLパラメータから取得するため問題なし）
2. **unitPrice**: PrismaはDecimal(15,2)だが、Zodはnumber - 精度の問題が発生する可能性がある

---

## Enumの整合性確認

### Gender
| Prisma | Zod (employees.ts) | Zod (import.ts) |
|--------|-------------------|-----------------|
| MALE | MALE | MALE |
| FEMALE | FEMALE | FEMALE |
| OTHER | OTHER | OTHER |

**整合性OK**

### ContractType (社員)
| Prisma | Zod (employees.ts) | Zod (import.ts) |
|--------|-------------------|-----------------|
| FULL_TIME | FULL_TIME | FULL_TIME |
| CONTRACT | CONTRACT | CONTRACT |
| PART_TIME | PART_TIME | PART_TIME |
| TEMPORARY | TEMPORARY | TEMPORARY |
| INTERN | INTERN | INTERN |
| OUTSOURCE | OUTSOURCE | OUTSOURCE |

**整合性OK**

### EmployeeStatus
| Prisma | Zod (employees.ts) | Zod (import.ts) |
|--------|-------------------|-----------------|
| ACTIVE | ACTIVE | ACTIVE |
| INACTIVE | INACTIVE | INACTIVE |
| RESIGNED | RESIGNED | RESIGNED |
| PENDING | PENDING | PENDING |

**整合性OK**

### SkillLevel
| Prisma | Zod (employees.ts) |
|--------|-------------------|
| BEGINNER | BEGINNER |
| INTERMEDIATE | INTERMEDIATE |
| ADVANCED | ADVANCED |
| EXPERT | EXPERT |

**整合性OK**

### UserRole
| Prisma | Zod (users.ts) |
|--------|----------------|
| ADMIN | ADMIN |
| EDITOR | EDITOR |
| VIEWER | VIEWER |

**整合性OK**

### CompanyStatus
| Prisma | Zod (companies.ts) |
|--------|-------------------|
| ACTIVE | ACTIVE |
| INACTIVE | INACTIVE |
| TERMINATED | TERMINATED |

**整合性OK**

### DepartmentType
| Prisma | Zod (companies.ts) |
|--------|-------------------|
| DIVISION | DIVISION |
| DEPARTMENT | DEPARTMENT |
| SECTION | SECTION |
| UNIT | UNIT |
| OTHER | OTHER |

**整合性OK**

### ContractTypeProject (案件)
| Prisma | Zod (projects.ts) |
|--------|-------------------|
| DISPATCH | DISPATCH |
| SES | SES |
| CONTRACT | CONTRACT |

**整合性OK**

### ProjectStatus
| Prisma | Zod (projects.ts) |
|--------|-------------------|
| PROPOSAL | PROPOSAL |
| IN_PROGRESS | IN_PROGRESS |
| COMPLETED | COMPLETED |
| CANCELLED | CANCELLED |
| ON_HOLD | ON_HOLD |

**整合性OK**

### BillingType
| Prisma | Zod (projects.ts) |
|--------|-------------------|
| HOURLY | HOURLY |
| DAILY | DAILY |
| MONTHLY | MONTHLY |
| FIXED | FIXED |

**整合性OK**

### AssignmentStatus
| Prisma | Zod (projects.ts) |
|--------|-------------------|
| SCHEDULED | SCHEDULED |
| IN_PROGRESS | IN_PROGRESS |
| COMPLETED | COMPLETED |

**整合性OK**

---

## 総合評価

### 問題なし（意図的な設計差異）

| 項目 | 説明 |
|-----|------|
| ID除外 | 自動生成されるため、入力スキーマからは除外 |
| タイムスタンプ除外 | createdAt/updatedAt は自動設定 |
| URLパラメータ | companyId, projectId等はURLから取得 |
| Date変換 | 文字列で受け取り、手動でDate変換（標準的なパターン） |
| password→passwordHash | セキュリティ上の変換処理 |

### 潜在的問題（要検討）

| 項目 | 詳細 | 重要度 |
|-----|------|--------|
| Decimal精度 | budget, unitPriceはDecimal(15,2)だが、Zodはnumberで受け取っている。JavaScriptの浮動小数点演算で精度が失われる可能性がある | 中 |

### 推奨対応

1. **金額フィールドの精度対応**
   - 現状: `z.number().optional().nullable()`
   - 推奨: 文字列で受け取り、バックエンドでDecimal変換、または小数点以下2桁制限を追加
   ```typescript
   budget: z.number().multipleOf(0.01).optional().nullable()
   // または
   budget: z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).optional().nullable()
   ```

---

## 結論

全体的に、PrismaスキーマとZodバリデーションスキーマは適切に整合が取れています。特に以下の点で優れた設計がなされています：

1. **Enum値の完全一致**: 全てのEnumがPrismaとZodで一致
2. **適切なnullable/optional設定**: Prismaの任意フィールドがZodでも正しく設定
3. **文字列長制限の一致**: VARCHARの長さとZodのmax()が一致
4. **日付処理の統一**: 文字列で受け取り、手動でDate変換する統一パターン

唯一の改善点として、金額系フィールド(budget, unitPrice)のDecimal精度対応を検討することを推奨します。

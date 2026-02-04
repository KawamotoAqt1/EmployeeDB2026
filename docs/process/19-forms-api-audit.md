# フォームコンポーネントとAPIリクエストの整合性監査レポート

**作成日**: 2026-02-04

## 概要

このドキュメントは、フロントエンドのフォームコンポーネントとバックエンドAPIスキーマの整合性を調査した結果です。

---

## 1. EmployeeForm.tsx (社員登録/編集フォーム)

### フォームフィールド

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| employeeNumber | string | Yes | 空文字チェック |
| employeeUniqueNumber | string | No | なし |
| fullName | string | Yes | 空文字チェック |
| fullNameKana | string | No | なし |
| email | string | No | type="email" |
| birthDate | string | No | type="date" |
| gender | string | No | enum: MALE, FEMALE, OTHER |
| contractType | string | No | enum: FULL_TIME, CONTRACT, OUTSOURCE |
| department | string | No | 選択リスト |
| position | string | No | 選択リスト |
| location | string | No | 選択リスト |
| country | string | No | 選択リスト |
| residence | string | No | なし |
| station | string | No | なし |
| hireDate | string | No | type="date" |
| contractEndDate | string | No | type="date" |
| status | string | No (default: ACTIVE) | enum: ACTIVE, INACTIVE, PENDING, RESIGNED |
| remark | string | No | なし |

### APIスキーマ (backend/src/routes/employees.ts - employeeSchema)

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| employeeNumber | string | Yes | min(1), max(20) |
| employeeUniqueNumber | string | No | max(50), nullable |
| fullName | string | Yes | min(1), max(100) |
| fullNameKana | string | No | max(100), nullable |
| email | string | No | email(), nullable |
| birthDate | string | No | nullable |
| gender | enum | No | MALE, FEMALE, OTHER, nullable |
| contractType | enum | No | FULL_TIME, CONTRACT, PART_TIME, TEMPORARY, INTERN, OUTSOURCE, nullable |
| department | string | No | max(100), nullable |
| position | string | No | max(100), nullable |
| location | string | No | max(100), nullable |
| country | string | No | max(50), nullable |
| residence | string | No | max(100), nullable |
| station | string | No | max(100), nullable |
| hireDate | string | No | nullable |
| contractEndDate | string | No | nullable |
| status | enum | No (default: ACTIVE) | ACTIVE, INACTIVE, RESIGNED, PENDING |
| remark | string | No | nullable |
| photoUrl | string | No | max(500), nullable |

### 不整合

1. **contractType の選択肢不足**: フォームでは3種類（FULL_TIME, CONTRACT, OUTSOURCE）のみ提供しているが、APIスキーマでは6種類（FULL_TIME, CONTRACT, PART_TIME, TEMPORARY, INTERN, OUTSOURCE）をサポート
2. **文字数制限の欠如**: フロントエンドでは各フィールドの文字数制限バリデーションが実装されていない（employeeNumber: max 20、fullName: max 100、residence: max 100 等）
3. **photoUrl フィールド未実装**: フォームには写真アップロード機能がない（別途 /api/employees/:id/image エンドポイントが存在）

---

## 2. CompanyForm.tsx (企業登録/編集フォーム)

### フォームフィールド

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| code | string | Yes | required属性 |
| name | string | Yes | required属性 |
| nameKana | string | No | なし |
| industry | string | No | なし |
| status | enum | No (default: ACTIVE) | ACTIVE, INACTIVE, TERMINATED |
| website | string | No | type="url" |
| remark | string | No | なし |
| offices[] | array | No | 複数入力可能 |
| offices[].name | string | No | なし |
| offices[].postalCode | string | No | なし |
| offices[].address | string | No | なし |
| offices[].phone | string | No | type="tel" |
| offices[].isHeadquarters | boolean | No | チェックボックス |
| departments[] | array | No | 未実装（UI表示なし） |
| contacts[] | array | No | 複数入力可能 |
| contacts[].name | string | No | なし |
| contacts[].nameKana | string | No | なし |
| contacts[].title | string | No | なし |
| contacts[].email | string | No | type="email" |
| contacts[].phone | string | No | type="tel" |
| contacts[].mobile | string | No | type="tel" |
| contacts[].isPrimary | boolean | No | チェックボックス |
| contacts[].remark | string | No | 未実装 |

### APIスキーマ (backend/src/routes/companies.ts - companyCreateSchema)

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| code | string | Yes | min(1), max(50) |
| name | string | Yes | min(1), max(200) |
| nameKana | string | No | max(200), nullable |
| postalCode | string | No | max(10), nullable |
| address | string | No | nullable |
| phone | string | No | max(20), nullable |
| website | string | No | max(500), nullable (空文字許容) |
| industry | string | No | max(100), nullable |
| status | enum | No (default: ACTIVE) | ACTIVE, INACTIVE, TERMINATED |
| remark | string | No | nullable |
| offices[] | array | No | - |
| offices[].name | string | Yes | min(1), max(200) |
| offices[].postalCode | string | No | max(10), nullable |
| offices[].address | string | No | nullable |
| offices[].phone | string | No | max(20), nullable |
| offices[].isHeadquarters | boolean | No (default: false) | - |
| contacts[] | array | No | - |
| contacts[].name | string | Yes | min(1), max(100) |
| contacts[].nameKana | string | No | max(100), nullable |
| contacts[].title | string | No | max(100), nullable |
| contacts[].email | string | No | email(), max(255), nullable (空文字許容) |
| contacts[].phone | string | No | max(20), nullable |
| contacts[].mobile | string | No | max(20), nullable |
| contacts[].isPrimary | boolean | No (default: false) | - |
| contacts[].remark | string | No | nullable |

### 不整合

1. **企業レベルのフィールド不一致**: APIスキーマには `postalCode`, `address`, `phone` フィールドがあるが、フォームでは企業レベルにこれらのフィールドがない（拠点レベルにのみ存在）
2. **departments UI未実装**: フォームのstateには`departments`が含まれているが、UIには部署入力セクションが実装されていない
3. **contacts[].remark 未実装**: 担当窓口の備考フィールドがフォームUIに表示されていない
4. **offices[].name 必須確認不足**: APIでは必須だが、フォームにはrequired属性がない
5. **contacts[].name 必須確認不足**: APIでは必須だが、フォームにはrequired属性がない
6. **文字数制限の欠如**: フロントエンドでは各フィールドの文字数制限バリデーションが実装されていない

---

## 3. ProjectForm.tsx (案件登録/編集フォーム)

### フォームフィールド

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| code | string | Yes | required属性 |
| name | string | Yes | required属性 |
| description | string | No | なし |
| status | enum | No (default: PROPOSAL) | PROPOSAL, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| contractType | enum | Yes | required属性, DISPATCH, SES, CONTRACT |
| companyId | string | Yes | required属性 |
| departmentId | string | No | 選択リスト（企業選択後に表示） |
| contractStartDate | string | No | type="date" |
| contractEndDate | string | No | type="date" |
| remark | string | No | なし |

### APIスキーマ (backend/src/routes/projects.ts - projectSchema)

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| code | string | Yes | min(1), max(50) |
| name | string | Yes | min(1, '案件名は必須です'), max(200) |
| description | string | No | nullable |
| companyId | string | Yes | uuid() |
| departmentId | string | No | uuid(), nullable |
| contractType | enum | Yes | DISPATCH, SES, CONTRACT |
| contractStartDate | string | No | nullable |
| contractEndDate | string | No | nullable |
| deliveryDate | string | No | nullable |
| budget | number | No | nullable |
| unitPrice | number | No | nullable |
| status | enum | No (default: PROPOSAL) | PROPOSAL, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD |
| location | string | No | max(200), nullable |
| remark | string | No | nullable |

### 不整合

1. **フィールド不足**: APIスキーマには以下のフィールドがあるが、フォームに実装されていない:
   - `deliveryDate` (納品日)
   - `budget` (予算)
   - `unitPrice` (単価)
   - `location` (勤務地)
2. **文字数制限の欠如**: フロントエンドでは文字数制限バリデーションが実装されていない（code: max 50、name: max 200、location: max 200）
3. **日付妥当性チェック不足**: フォームでは契約開始日と終了日の前後関係チェックがない（APIではバリデーション実装済み）

---

## 4. UserManagement.tsx (ユーザー管理フォーム)

### フォームフィールド (作成)

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| email | string | Yes | type="email" |
| password | string | Yes | なし（UIでは「6文字以上」とplaceholderに記載） |
| role | enum | No (default: VIEWER) | ADMIN, EDITOR, VIEWER |

### フォームフィールド (更新)

| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| email | string | Yes | type="email" |
| password | string | No | なし（空欄時は更新しない） |
| role | enum | No | ADMIN, EDITOR, VIEWER |

### APIスキーマ (backend/src/routes/users.ts)

**createUserSchema:**
| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| email | string | Yes | email('有効なメールアドレスを入力してください') |
| password | string | Yes | min(6, 'パスワードは6文字以上で入力してください') |
| role | enum | No (default: VIEWER) | ADMIN, EDITOR, VIEWER |

**updateUserSchema:**
| フィールド | 型 | 必須 | バリデーション |
|------------|-----|------|----------------|
| email | string | No | email('有効なメールアドレスを入力してください') |
| password | string | No | min(6, 'パスワードは6文字以上で入力してください') |
| role | enum | No | ADMIN, EDITOR, VIEWER |

### 不整合

1. **パスワード文字数チェック不足**: フォームではパスワードの6文字以上チェックが実装されていない（placeholderのみ）
2. **メールアドレス必須チェック**: 更新フォームでは`email`が必須になっているが、APIスキーマではオプショナル

---

## 5. types/index.ts のリクエスト型定義との不整合

### CreateEmployeeRequest vs 実際のフォーム送信データ

**types/index.ts 定義:**
```typescript
interface CreateEmployeeRequest {
  employeeCode: string;
  firstName: string;
  lastName: string;
  firstNameKana?: string;
  lastNameKana?: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  birthDate?: string;
  bio?: string;
}
```

**実際のフォーム送信データ:**
```typescript
{
  employeeNumber: string;
  employeeUniqueNumber?: string;
  fullName: string;
  fullNameKana?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  contractType?: string;
  department?: string;
  position?: string;
  location?: string;
  country?: string;
  residence?: string;
  station?: string;
  hireDate?: string;
  contractEndDate?: string;
  status: string;
  remark?: string;
}
```

**重大な不整合:**
- `employeeCode` vs `employeeNumber`: フィールド名が異なる
- `firstName/lastName` vs `fullName`: フィールド構造が異なる
- `firstNameKana/lastNameKana` vs `fullNameKana`: フィールド構造が異なる
- types/index.ts に多くのフィールドが欠如（gender, contractType, location, country, residence, station, contractEndDate, status, remark）
- `email` が types/index.ts では必須だが、実際はオプショナル
- `phone`, `bio` は types/index.ts にあるが実際のフォームでは未使用

### CreateCompanyRequest - 整合

types/index.ts の `CreateCompanyRequest` はフォームと概ね整合

### CreateProjectRequest - 整合

types/index.ts の `CreateProjectRequest` はフォームと概ね整合

### CreateUserRequest vs useUsers.ts

**types/index.ts 定義:**
```typescript
interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: number;
}
```

**useUsers.ts での定義（実際に使用）:**
```typescript
interface CreateUserRequest {
  email: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}
```

**不整合:**
- `username` が types/index.ts にあるが実際は未使用
- `employeeId` が types/index.ts にあるが実際は未使用

---

## 総括

### 重大な問題

1. **types/index.ts の CreateEmployeeRequest が実装と完全に不一致** - この型定義は使用されておらず、実際のフォームとAPIスキーマとは全く異なる構造

2. **文字数制限バリデーションの欠如** - 全フォームにおいて、フロントエンドでの文字数制限チェックが実装されていない。APIでZodスキーマによりバリデーションされるが、ユーザー体験向上のためフロントエンドでも実装すべき

3. **ProjectFormの機能不足** - deliveryDate, budget, unitPrice, location フィールドがフォームに存在しない

4. **CompanyFormの機能不足** - 企業レベルの住所・電話番号フィールド、部署管理UI、担当窓口備考フィールドが未実装

### 中程度の問題

1. **EmployeeFormのcontractType選択肢不足** - PART_TIME, TEMPORARY, INTERN が選択できない

2. **必須フィールド表示の一貫性** - 一部のフォームでは必須マークが表示されていない

3. **日付妥当性チェック** - ProjectFormで開始日・終了日の前後関係チェックがフロントエンドにない

### 推奨対応

1. types/index.ts の型定義を実際の実装に合わせて更新する
2. 各フォームに文字数制限バリデーションを追加する
3. ProjectFormに不足フィールドを追加する
4. CompanyFormに部署管理UIを追加する
5. 必須フィールドのUI表示を統一する

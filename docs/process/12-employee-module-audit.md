# 社員（Employee）モジュール完全仕様調査

## 調査日時
2026-02-04

## 調査対象ファイル
- `backend/prisma/schema.prisma`
- `backend/src/routes/employees.ts`
- `frontend/src/types/index.ts`
- `frontend/src/pages/EmployeeForm.tsx`
- `frontend/src/pages/EmployeeList.tsx`
- `frontend/src/pages/EmployeeDetail.tsx`
- `frontend/src/hooks/useEmployees.ts`
- `frontend/src/components/employee/EmployeeFilter.tsx`
- `frontend/src/components/employee/EmployeeDetailPanel.tsx`
- `frontend/src/components/employee/SkillTagSelector.tsx`

---

## 1. 全フィールドの列挙（DB → API → フロントエンド）

### 1.1 Prisma Schema (Employee モデル)

| フィールド名 | DB カラム名 | 型 | 必須 | デフォルト | 説明 |
|-------------|-------------|-----|------|-----------|------|
| id | id | UUID | Yes | uuid() | 主キー |
| employeeNumber | employee_number | VarChar(20) | Yes | - | 社員番号（一意） |
| employeeUniqueNumber | employee_unique_number | VarChar(50) | No | - | 社員固有番号（一意） |
| fullName | full_name | VarChar(100) | Yes | - | 氏名 |
| fullNameKana | full_name_kana | VarChar(100) | No | - | 氏名カナ |
| email | email | VarChar(255) | No | - | メール（一意） |
| birthDate | birth_date | Date | No | - | 生年月日 |
| gender | gender | Enum(MALE/FEMALE/OTHER) | No | - | 性別 |
| contractType | contract_type | Enum(FULL_TIME/CONTRACT/PART_TIME/TEMPORARY/INTERN/OUTSOURCE) | No | - | 契約形態 |
| department | department | VarChar(100) | No | - | 部署 |
| position | position | VarChar(100) | No | - | 役職 |
| location | location | VarChar(100) | No | - | 勤務地 |
| country | country | VarChar(50) | No | - | 国 |
| residence | residence | VarChar(100) | No | - | 住所 |
| station | station | VarChar(100) | No | - | 最寄り駅 |
| hireDate | hire_date | Date | No | - | 入社日 |
| contractEndDate | contract_end_date | Date | No | - | 契約終了日 |
| status | status | Enum(ACTIVE/INACTIVE/RESIGNED/PENDING) | Yes | ACTIVE | 社員ステータス |
| remark | remark | Text | No | - | 備考 |
| photoUrl | photo_url | VarChar(500) | No | - | 写真URL |
| createdAt | created_at | DateTime | Yes | now() | 作成日時 |
| updatedAt | updated_at | DateTime | Yes | @updatedAt | 更新日時 |

### 1.2 EmployeeSkill モデル（スキル中間テーブル）

| フィールド名 | DB カラム名 | 型 | 必須 | デフォルト | 説明 |
|-------------|-------------|-----|------|-----------|------|
| id | id | UUID | Yes | uuid() | 主キー |
| employeeId | employee_id | UUID | Yes | - | 社員ID（FK） |
| tagId | tag_id | UUID | Yes | - | タグID（FK） |
| level | level | Enum(BEGINNER/INTERMEDIATE/ADVANCED/EXPERT) | Yes | BEGINNER | スキルレベル |
| createdAt | created_at | DateTime | Yes | now() | 作成日時 |

**ユニーク制約**: `employeeId` + `tagId` の組み合わせ

### 1.3 バックエンド Zod バリデーションスキーマ

#### employeeSchema（作成・更新用）

```typescript
const employeeSchema = z.object({
  employeeNumber: z.string().min(1).max(20),              // 必須
  employeeUniqueNumber: z.string().max(50).optional().nullable(),
  fullName: z.string().min(1).max(100),                   // 必須
  fullNameKana: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable(),
  birthDate: z.string().optional().nullable(),            // 文字列として受信
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  contractType: z.enum(['FULL_TIME', 'CONTRACT', 'PART_TIME', 'TEMPORARY', 'INTERN', 'OUTSOURCE']).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
  residence: z.string().max(100).optional().nullable(),
  station: z.string().max(100).optional().nullable(),
  hireDate: z.string().optional().nullable(),             // 文字列として受信
  contractEndDate: z.string().optional().nullable(),      // 文字列として受信
  status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'PENDING']).optional().default('ACTIVE'),
  remark: z.string().optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
});
```

#### addSkillSchema（スキル追加用）

```typescript
const addSkillSchema = z.object({
  tagId: z.string().uuid(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional().default('BEGINNER'),
});
```

### 1.4 フロントエンド 型定義

#### Employee インターフェース

```typescript
export interface Employee {
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

### 1.5 EmployeeForm FormData

```typescript
interface FormData {
  employeeNumber: string;
  employeeUniqueNumber: string;
  fullName: string;
  fullNameKana: string;
  email: string;
  birthDate: string;
  gender: string;
  contractType: string;
  department: string;
  position: string;
  location: string;
  country: string;
  residence: string;
  station: string;
  hireDate: string;
  contractEndDate: string;
  status: string;
  remark: string;
}
```

---

## 2. CRUD 各操作のリクエスト/レスポンス形式

### 2.1 一覧取得 GET /api/employees

#### リクエストパラメータ（クエリストリング）

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| q | string | - | 検索キーワード（全フィールド対象） |
| department | string | - | 部署フィルタ |
| position | string | - | 役職フィルタ |
| location | string | - | 勤務地フィルタ |
| status | ACTIVE/INACTIVE/RESIGNED/PENDING | - | ステータスフィルタ |
| tags | string | - | タグID（カンマ区切り） |
| tagOperator | AND/OR | AND | タグの検索演算子 |
| matchType | partial/prefix | partial | 検索一致タイプ |
| level | SkillLevel | - | 最低スキルレベル |
| page | number | 1 | ページ番号 |
| limit | number | 20 | 1ページあたりの件数（最大100） |
| sortBy | string | employeeNumber | ソートフィールド |
| sortOrder | asc/desc | asc | ソート順 |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeNumber": "EMP001",
      "fullName": "山田太郎",
      "skills": [
        {
          "id": "skill-uuid",
          "employeeId": "emp-uuid",
          "tagId": "tag-uuid",
          "level": "INTERMEDIATE",
          "tag": {
            "id": "tag-uuid",
            "name": "Java",
            "categoryId": "cat-uuid",
            "category": {
              "id": "cat-uuid",
              "code": "TECH",
              "name": "技術"
            }
          }
        }
      ],
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 2.2 詳細取得 GET /api/employees/:id

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employeeNumber": "EMP001",
    "fullName": "山田太郎",
    "skills": [...],
    ...
  }
}
```

### 2.3 作成 POST /api/employees

**権限**: ADMIN / EDITOR

#### リクエストボディ

```json
{
  "employeeNumber": "EMP001",      // 必須
  "fullName": "山田太郎",           // 必須
  "employeeUniqueNumber": "...",   // 任意
  "fullNameKana": "ヤマダタロウ",    // 任意
  "email": "yamada@example.com",   // 任意
  "birthDate": "1990-01-01",       // 任意（YYYY-MM-DD形式）
  "gender": "MALE",                // 任意
  "contractType": "FULL_TIME",     // 任意
  "department": "開発１課",          // 任意
  "position": "一般",               // 任意
  "location": "東京",               // 任意
  "country": "日本",                // 任意
  "residence": "東京都...",         // 任意
  "station": "新宿駅",              // 任意
  "hireDate": "2020-04-01",        // 任意
  "contractEndDate": "2025-03-31", // 任意
  "status": "ACTIVE",              // 任意（デフォルト: ACTIVE）
  "remark": "備考...",             // 任意
  "photoUrl": "/uploads/..."       // 任意
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    ...
  }
}
```

### 2.4 更新 PUT /api/employees/:id

**権限**: ADMIN / EDITOR

#### リクエストボディ

部分更新が可能（`employeeSchema.partial()`）

### 2.5 削除 DELETE /api/employees/:id

**権限**: ADMIN / EDITOR

#### レスポンス

```json
{
  "success": true,
  "data": {
    "message": "社員を削除しました"
  }
}
```

### 2.6 スキル追加 POST /api/employees/:id/skills

**権限**: ADMIN / EDITOR

#### リクエストボディ

```json
{
  "tagId": "tag-uuid",
  "level": "INTERMEDIATE"  // デフォルト: BEGINNER
}
```

**注意**: 既存のスキルがある場合は `upsert` で更新される

### 2.7 スキル削除 DELETE /api/employees/:id/skills/:skillId

**権限**: ADMIN / EDITOR

### 2.8 画像アップロード POST /api/employees/:id/image

**権限**: ADMIN のみ

- **Content-Type**: multipart/form-data
- **フィールド名**: image
- **許可形式**: JPEG, PNG, GIF, WebP
- **最大サイズ**: 5MB

### 2.9 画像削除 DELETE /api/employees/:id/image

**権限**: ADMIN のみ

### 2.10 参画履歴取得 GET /api/employees/:id/assignments

#### クエリパラメータ

| パラメータ | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| status | string | - | 参画ステータスフィルタ |
| page | number | 1 | ページ番号 |
| limit | number | 20 | 1ページあたりの件数 |

---

## 3. フォームのフィールドとAPIリクエストの対応

### EmployeeForm.tsx のフィールド一覧

| フォームフィールド | Inputコンポーネント | API フィールド名 | 変換処理 |
|-------------------|---------------------|------------------|----------|
| employeeNumber | Input (required) | employeeNumber | そのまま |
| employeeUniqueNumber | Input | employeeUniqueNumber | 空文字 → undefined |
| fullName | Input (required) | fullName | そのまま |
| fullNameKana | Input | fullNameKana | 空文字 → undefined |
| email | Input (type=email) | email | 空文字 → undefined |
| birthDate | Input (type=date) | birthDate | 空文字 → undefined |
| gender | Select | gender | 空文字 → undefined |
| contractType | Select | contractType | 空文字 → undefined |
| department | Select | department | 空文字 → undefined |
| position | Select | position | 空文字 → undefined |
| location | Select | location | 空文字 → undefined |
| country | Select | country | 空文字 → undefined |
| residence | Input | residence | 空文字 → undefined |
| station | Input | station | 空文字 → undefined |
| hireDate | Input (type=date) | hireDate | 空文字 → undefined |
| contractEndDate | Input (type=date) | contractEndDate | 空文字 → undefined |
| status | Select | status | そのまま（デフォルト: ACTIVE） |
| remark | textarea | remark | 空文字 → undefined |

### SkillTagSelector による追加スキル

- フォーム内で選択したスキルは `selectedSkills: AddEmployeeSkillRequest[]` で管理
- 社員作成/更新後に、各スキルを個別に `POST /api/employees/:id/skills` で登録
- 既存スキルは `existingSkills` として渡され、選択不可として表示

---

## 4. バリデーションルール比較（Zod vs フロントエンド）

### 4.1 バックエンド Zod バリデーション

| フィールド | バリデーション |
|-----------|---------------|
| employeeNumber | 必須、最大20文字 |
| employeeUniqueNumber | 最大50文字、オプション |
| fullName | 必須、最大100文字 |
| fullNameKana | 最大100文字、オプション |
| email | メール形式、オプション |
| birthDate | 文字列、オプション |
| gender | MALE/FEMALE/OTHER のいずれか、オプション |
| contractType | 6つの値のいずれか、オプション |
| department | 最大100文字、オプション |
| position | 最大100文字、オプション |
| location | 最大100文字、オプション |
| country | 最大50文字、オプション |
| residence | 最大100文字、オプション |
| station | 最大100文字、オプション |
| hireDate | 文字列、オプション |
| contractEndDate | 文字列、オプション |
| status | 4つの値のいずれか、デフォルト ACTIVE |
| remark | オプション |
| photoUrl | 最大500文字、オプション |

### 4.2 フロントエンド バリデーション（EmployeeForm.tsx）

```typescript
const validate = (): boolean => {
  const newErrors: Partial<Record<keyof FormData, string>> = {};

  if (!formData.employeeNumber.trim()) {
    newErrors.employeeNumber = '社員番号は必須です';
  }
  if (!formData.fullName.trim()) {
    newErrors.fullName = '氏名は必須です';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### 4.3 バリデーション差異一覧

| 観点 | バックエンド | フロントエンド | 差異 |
|-----|-------------|---------------|------|
| employeeNumber 必須 | Yes | Yes | 一致 |
| employeeNumber 最大長 | 20文字 | チェックなし | **差異あり** |
| fullName 必須 | Yes | Yes | 一致 |
| fullName 最大長 | 100文字 | チェックなし | **差異あり** |
| email 形式 | Zod .email() | type="email" | ブラウザ依存 |
| 各フィールド最大長 | Zodで定義 | チェックなし | **差異あり** |
| 日付形式 | 文字列として受け取り | HTML date input | 形式は一致 |
| enum値 | 厳密にチェック | Select固定値 | 一致 |

---

## 5. スキル管理の実装状態

### 5.1 バックエンド実装

#### 提供エンドポイント

| メソッド | パス | 機能 |
|---------|------|------|
| POST | /api/employees/:id/skills | スキル追加（upsert） |
| DELETE | /api/employees/:id/skills/:skillId | スキル削除 |

#### 実装の特徴

- スキル追加は `upsert` 方式（既存の場合はレベル更新）
- 社員詳細取得時にスキル情報を `include` で取得
- タグのカテゴリ情報も含めて返却

### 5.2 フロントエンド実装

#### useEmployees.ts のスキル関連フック

| フック名 | 機能 |
|---------|------|
| useAddEmployeeSkill | スキル追加 |
| useUpdateEmployeeSkill | スキル更新（API未実装） |
| useDeleteEmployeeSkill | スキル削除 |

#### SkillTagSelector コンポーネント

- カテゴリ別にタグを表示
- スキルレベル選択UI
- 既存スキルは選択不可として表示
- 選択中のスキルをリスト表示

### 5.3 スキル管理の課題

| 項目 | 状態 | 詳細 |
|-----|------|------|
| スキル追加 | 実装済み | フォーム送信後に個別登録 |
| スキル更新 | フック存在、API未実装 | `PUT /employees/:id/skills/:skillId` がない |
| スキル削除 | 実装済み | 詳細画面から削除可能かは未確認 |
| 既存スキルの編集 | 未実装 | 詳細画面やフォームでの既存スキル編集UI不在 |

---

## 6. 不整合・実装漏れ一覧

### 6.1 型定義の不整合

| 問題 | 詳細 | 影響 | 優先度 |
|-----|------|------|--------|
| CreateEmployeeRequest 型の未使用 | types/index.ts に定義されているが、実際のフォームでは使用されていない（フィールド名が異なる） | 型の形骸化 | 低 |
| UpdateEmployeeRequest 型の未使用 | 同上 | 型の形骸化 | 低 |
| CreateEmployeeRequest のフィールド名相違 | employeeCode vs employeeNumber、firstName/lastName vs fullName | 混乱の原因 | 中 |

### 6.2 APIの不整合

| 問題 | 詳細 | 影響 | 優先度 |
|-----|------|------|--------|
| スキル更新API未実装 | `PUT /employees/:id/skills/:skillId` が存在しない | スキルレベル変更不可 | 中 |
| useUpdateEmployeeSkill フックが動作しない | 対応するAPIエンドポイントなし | 機能不全 | 中 |

### 6.3 バリデーションの不整合

| 問題 | 詳細 | 影響 | 優先度 |
|-----|------|------|--------|
| フロントエンドで最大長チェックなし | employeeNumber(20文字), fullName(100文字)等 | サーバーエラー表示 | 低 |
| フロントエンドでemail形式チェック弱い | ブラウザ依存のHTML5バリデーション | 不正な値送信可能性 | 低 |
| 日付形式のバリデーションなし | バックエンドで文字列として受け取り、Date変換 | 不正形式でエラー | 低 |

### 6.4 UI/機能の不整合

| 問題 | 詳細 | 影響 | 優先度 |
|-----|------|------|--------|
| 既存スキルの編集UIなし | フォームで既存スキルを編集できない | UX低下 | 中 |
| 既存スキルの削除UIなし（フォーム内） | フォーム内で既存スキル削除不可 | UX低下 | 低 |
| 画像アップロードがADMIN限定 | EDITORは画像変更不可 | 権限設計の妥当性 | 低 |
| contractType の選択肢不完全 | フォームは3つ（正社員/契約社員/BP）、Zodは6つ | データ登録制限 | 中 |

### 6.5 ドロップダウン選択肢の問題

| フィールド | 問題 | 詳細 |
|-----------|------|------|
| contractType | 選択肢不足 | PART_TIME, TEMPORARY, INTERN がフォームにない |
| department | ハードコード | データベースから動的取得していない |
| position | ハードコード | 同上 |
| location | ハードコード | 同上 |
| country | ハードコード | 同上 |

### 6.6 その他の問題

| 問題 | 詳細 | 影響 | 優先度 |
|-----|------|------|--------|
| EmployeeStatusLabels の PENDING 表示名 | 「退職（求職）」だが、Prismaでは「入社予定」 | 意味の相違 | 高 |
| フォームのステータス選択肢の意味 | 「退職（求職）」が PENDING にマッピング | 意味の相違 | 高 |

---

## 7. 推奨対応

### 高優先度

1. **EmployeeStatus の PENDING の意味を統一する**
   - Prisma定義: 入社予定
   - フロントエンド: 退職（求職）
   - どちらかに統一が必要

### 中優先度

2. **スキル更新API (PUT /employees/:id/skills/:skillId) を実装する**
3. **既存スキルの編集UIを追加する**
4. **contractType の選択肢をすべて表示する**
5. **CreateEmployeeRequest/UpdateEmployeeRequest 型を実態に合わせて修正または削除する**

### 低優先度

6. **フロントエンドに最大長バリデーションを追加する**
7. **ドロップダウン選択肢を動的に取得する仕組みを検討する**

---

## 8. フィールド対応表（完全版）

| Prisma | Zod | Frontend Type | Form Field | 必須 | 備考 |
|--------|-----|---------------|------------|------|------|
| id | - | id | - | - | 自動生成 |
| employeeNumber | employeeNumber | employeeNumber | employeeNumber | Yes | |
| employeeUniqueNumber | employeeUniqueNumber | employeeUniqueNumber | employeeUniqueNumber | No | |
| fullName | fullName | fullName | fullName | Yes | |
| fullNameKana | fullNameKana | fullNameKana | fullNameKana | No | |
| email | email | email | email | No | |
| birthDate | birthDate | birthDate | birthDate | No | Date→String変換 |
| gender | gender | gender | gender | No | |
| contractType | contractType | contractType | contractType | No | 選択肢不完全 |
| department | department | department | department | No | |
| position | position | position | position | No | |
| location | location | location | location | No | |
| country | country | country | country | No | |
| residence | residence | residence | residence | No | |
| station | station | station | station | No | |
| hireDate | hireDate | hireDate | hireDate | No | Date→String変換 |
| contractEndDate | contractEndDate | contractEndDate | contractEndDate | No | Date→String変換 |
| status | status | status | status | No | デフォルト: ACTIVE |
| remark | remark | remark | remark | No | |
| photoUrl | photoUrl | photoUrl | - | No | 別API経由 |
| createdAt | - | createdAt | - | - | 自動生成 |
| updatedAt | - | updatedAt | - | - | 自動更新 |
| skills | - | skills | SkillTagSelector | - | 別API経由 |
| assignments | - | assignments | - | - | 読み取り専用 |

---

## 9. まとめ

社員モジュールは基本的なCRUD機能が実装されており、検索・フィルタ機能も充実している。しかし、以下の点で改善が必要：

1. **ステータス PENDING の意味相違** が最も重要な問題
2. スキル管理において更新機能が欠落
3. 型定義とフォームの不一致（使用されていない型定義の存在）
4. バリデーションがバックエンド依存（フロントエンドでの事前検証が不十分）
5. 契約形態の選択肢が不完全

全体的に動作はするが、細部の整合性に課題がある状態。

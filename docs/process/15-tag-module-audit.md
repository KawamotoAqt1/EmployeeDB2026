# タグ（Tag）モジュール完全仕様調査レポート

作成日: 2026-02-04

## 1. 概要

本ドキュメントは、タグモジュールの完全な仕様調査結果をまとめたものです。データベース層、バックエンドAPI層、フロントエンド層のすべてにわたり、フィールド定義、CRUD操作、および不整合点を詳細に記録しています。

---

## 2. データベース層（Prisma Schema）

### 2.1 TagCategory（タグカテゴリマスタ）

**ファイル**: `backend/prisma/schema.prisma`（79-95行目）

| フィールド名 | 型 | DB型 | デフォルト | 説明 |
|-------------|-----|------|-----------|------|
| id | String | UUID | uuid() | 主キー |
| code | String | VARCHAR(50) | - | 一意コード |
| name | String | VARCHAR(100) | - | カテゴリ名 |
| parentId | String? | UUID | null | 親カテゴリID（自己参照） |
| sortOrder | Int | INT | 0 | 並び順 |
| createdAt | DateTime | TIMESTAMP | now() | 作成日時 |

**リレーション**:
- `parent`: 自己参照（親カテゴリ）
- `children`: 自己参照（子カテゴリ配列）
- `tags`: Tag[] - 所属タグ

**テーブル名**: `tag_categories`

**制約**:
- `code` フィールドに UNIQUE 制約

---

### 2.2 Tag（タグマスタ）

**ファイル**: `backend/prisma/schema.prisma`（98-111行目）

| フィールド名 | 型 | DB型 | デフォルト | 説明 |
|-------------|-----|------|-----------|------|
| id | String | UUID | uuid() | 主キー |
| categoryId | String | UUID | - | カテゴリID（必須） |
| name | String | VARCHAR(100) | - | タグ名 |
| sortOrder | Int | INT | 0 | 並び順 |
| createdAt | DateTime | TIMESTAMP | now() | 作成日時 |

**リレーション**:
- `category`: TagCategory - 所属カテゴリ
- `employeeSkills`: EmployeeSkill[] - 社員スキル

**テーブル名**: `tags`

**制約**:
- `@@unique([categoryId, name])` - カテゴリ内でタグ名は一意

---

### 2.3 EmployeeSkill（社員スキル中間テーブル）

**ファイル**: `backend/prisma/schema.prisma`（114-127行目）

| フィールド名 | 型 | DB型 | デフォルト | 説明 |
|-------------|-----|------|-----------|------|
| id | String | UUID | uuid() | 主キー |
| employeeId | String | UUID | - | 社員ID |
| tagId | String | UUID | - | タグID |
| level | SkillLevel | ENUM | BEGINNER | スキルレベル |
| createdAt | DateTime | TIMESTAMP | now() | 作成日時 |

**リレーション**:
- `employee`: Employee - 社員
- `tag`: Tag - タグ

**テーブル名**: `employee_skills`

**制約**:
- `@@unique([employeeId, tagId])` - 社員とタグの組み合わせは一意
- カスケード削除: Employee/Tag削除時に自動削除

---

### 2.4 SkillLevel（スキルレベルENUM）

```prisma
enum SkillLevel {
  BEGINNER      // 初級
  INTERMEDIATE  // 中級
  ADVANCED      // 上級
  EXPERT        // エキスパート
}
```

---

## 3. バックエンドAPI層

### 3.1 APIエンドポイント一覧

**ファイル**: `backend/src/routes/tags.ts`

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| GET | /api/tags/categories | requireAuth | カテゴリ一覧（タグ含む） |
| POST | /api/tags/categories | requireEditor | カテゴリ作成 |
| PUT | /api/tags/categories/:id | requireEditor | カテゴリ更新 |
| DELETE | /api/tags/categories/:id | requireEditor | カテゴリ削除 |
| PUT | /api/tags/categories/reorder | requireEditor | カテゴリ並び替え |
| GET | /api/tags | requireAuth | タグ一覧 |
| POST | /api/tags | requireEditor | タグ作成 |
| PUT | /api/tags/:id | requireEditor | タグ更新 |
| DELETE | /api/tags/:id | requireEditor | タグ削除 |
| PUT | /api/tags/reorder | requireEditor | タグ並び替え |

### 3.2 バリデーションスキーマ（Zod）

#### カテゴリ作成・更新スキーマ（12-17行目）
```typescript
const categorySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().optional().default(0),
});
```

#### タグ作成・更新スキーマ（20-24行目）
```typescript
const tagSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().int().optional().default(0),
});
```

#### タグ並び替えスキーマ（318-320行目）
```typescript
const reorderTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()),
});
```

#### カテゴリ並び替えスキーマ（350-352行目）
```typescript
const reorderCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()),
});
```

### 3.3 CRUD操作の詳細

#### GET /api/tags/categories（カテゴリ一覧）

**リクエスト**: なし

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "TECH",
      "name": "技術",
      "parentId": null,
      "sortOrder": 0,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "tags": [...],
      "children": [...]
    }
  ]
}
```

**特記事項**:
- 親カテゴリのみ返却（子は `children` に入れ子で含まれる）
- ソート順: `sortOrder` → `name` の昇順

---

#### POST /api/tags/categories（カテゴリ作成）

**リクエスト**:
```json
{
  "code": "TECH",
  "name": "技術",
  "parentId": null,
  "sortOrder": 0
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "TECH",
    "name": "技術",
    "parentId": null,
    "sortOrder": 0,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "tags": [],
    "children": []
  }
}
```

**バリデーション**:
- `code`: 必須、1-50文字
- `name`: 必須、1-100文字
- `parentId`: 任意、存在する場合は親カテゴリの存在確認

---

#### PUT /api/tags/categories/:id（カテゴリ更新）

**リクエスト**: 部分更新可（partial）

**特記事項**:
- 自分自身を親に設定不可
- 親カテゴリの存在確認

---

#### DELETE /api/tags/categories/:id（カテゴリ削除）

**削除制限**:
- 子カテゴリが存在する場合は削除不可（エラー: `HAS_CHILDREN`）
- タグが存在する場合は削除不可（エラー: `HAS_TAGS`）

---

#### GET /api/tags（タグ一覧）

**リクエストクエリ**:
- `categoryId`: カテゴリIDでフィルタ（任意）
- `limit`: 取得件数（デフォルト: 1000）

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "name": "Python",
      "sortOrder": 0,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "category": {...}
    }
  ]
}
```

---

#### POST /api/tags（タグ作成）

**リクエスト**:
```json
{
  "categoryId": "uuid",
  "name": "Python",
  "sortOrder": 0
}
```

**バリデーション**:
- `categoryId`: 必須、UUID形式、存在確認
- `name`: 必須、1-100文字
- カテゴリ内でタグ名は一意

---

#### PUT /api/tags/:id（タグ更新）

**リクエスト**: 部分更新可（partial）

---

#### DELETE /api/tags/:id（タグ削除）

**削除制限**:
- 社員スキルに使用されている場合はエラー（エラー: `TAG_IN_USE`）
- エラーメッセージに使用人数を含む

---

#### PUT /api/tags/reorder（タグ並び替え）

**リクエスト**:
```json
{
  "tagIds": ["uuid1", "uuid2", "uuid3"]
}
```

**処理**:
- トランザクションで一括更新
- 配列の順番が `sortOrder` になる（0から開始）

---

#### PUT /api/tags/categories/reorder（カテゴリ並び替え）

**リクエスト**:
```json
{
  "categoryIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

### 3.4 社員スキル関連API

**ファイル**: `backend/src/routes/employees.ts`

| メソッド | パス | 権限 | 説明 |
|---------|------|------|------|
| POST | /api/employees/:id/skills | requireEditor | スキル追加（upsert） |
| DELETE | /api/employees/:id/skills/:skillId | requireEditor | スキル削除 |

#### POST /api/employees/:id/skills

**リクエスト**:
```json
{
  "tagId": "uuid",
  "level": "INTERMEDIATE"
}
```

**特記事項**:
- 既存の場合は更新（upsert動作）
- `level` のデフォルトは `BEGINNER`

---

## 4. フロントエンド層

### 4.1 型定義

**ファイル**: `frontend/src/types/index.ts`

#### TagCategory インターフェース（35-44行目）
```typescript
export interface TagCategory {
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

#### Tag インターフェース（47-54行目）
```typescript
export interface Tag {
  id: string;
  name: string;
  categoryId: string;
  category?: TagCategory;
  sortOrder: number;
  createdAt: string;
}
```

#### EmployeeSkill インターフェース（57-64行目）
```typescript
export interface EmployeeSkill {
  id: string;
  employeeId: string;
  tagId: string;
  tag?: Tag;
  level: SkillLevel;
  createdAt: string;
}
```

#### SkillLevel 型（10行目）
```typescript
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
```

#### SkillLevelLabels（13-18行目）
```typescript
export const SkillLevelLabels: Record<SkillLevel, string> = {
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '上級',
  EXPERT: 'エキスパート',
};
```

---

### 4.2 APIリクエスト型定義

**ファイル**: `frontend/src/types/index.ts`

#### CreateTagRequest（173-176行目）
```typescript
export interface CreateTagRequest {
  name: string;
  categoryId: string;
}
```

#### UpdateTagRequest（179行目）
```typescript
export interface UpdateTagRequest extends Partial<CreateTagRequest> {}
```

#### CreateTagCategoryRequest（182-186行目）
```typescript
export interface CreateTagCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}
```

#### UpdateTagCategoryRequest（189行目）
```typescript
export interface UpdateTagCategoryRequest extends Partial<CreateTagCategoryRequest> {}
```

#### TagSearchParams（277-282行目）
```typescript
export interface TagSearchParams {
  keyword?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}
```

---

### 4.3 カスタムフック

**ファイル**: `frontend/src/hooks/useTags.ts`

| フック名 | 用途 |
|---------|------|
| useTagList | タグ一覧取得（ページネーション付き） |
| useAllTags | 全タグ取得（フィルター用） |
| useTagCategories | カテゴリ一覧取得 |
| useCreateTag | タグ作成 |
| useUpdateTag | タグ更新 |
| useDeleteTag | タグ削除 |
| useCreateTagCategory | カテゴリ作成 |
| useUpdateTagCategory | カテゴリ更新 |
| useDeleteTagCategory | カテゴリ削除 |
| useReorderTags | タグ並び替え |
| useReorderCategories | カテゴリ並び替え |
| useTags | タグとカテゴリをまとめて取得 |

---

### 4.4 タグ管理画面

**ファイル**: `frontend/src/pages/TagManagement.tsx`

**機能**:
- カテゴリタブによる表示切り替え
- タグのドラッグ&ドロップ並び替え（dnd-kit使用）
- カテゴリ/タグのCRUDモーダル
- タグ検索フィルタ

**アクセス制限**:
- ADMIN権限のみ（142-144行目）

---

### 4.5 APIエンドポイント設定

**ファイル**: `frontend/src/api/config.ts`

```typescript
tags: {
  list: '/tags',
  detail: (id: string) => `/tags/${id}`,
  create: '/tags',
  update: (id: string) => `/tags/${id}`,
  delete: (id: string) => `/tags/${id}`,
},
tagCategories: {
  list: '/tags/categories',
  detail: (id: string) => `/tags/categories/${id}`,
  create: '/tags/categories',
  update: (id: string) => `/tags/categories/${id}`,
  delete: (id: string) => `/tags/categories/${id}`,
},
```

---

## 5. ソート順管理の詳細

### 5.1 データベース層

- `TagCategory.sortOrder`: INT, デフォルト0
- `Tag.sortOrder`: INT, デフォルト0

### 5.2 API層

**取得時のソート**:
- カテゴリ: `sortOrder` ASC → `name` ASC
- タグ: `sortOrder` ASC → `name` ASC

**並び替えAPI**:
- `/api/tags/reorder`: 配列順でsortOrderを0から連番で設定
- `/api/tags/categories/reorder`: 同上

### 5.3 フロントエンド層

- dnd-kitによるドラッグ&ドロップUI
- `arrayMove`で配列を並び替え後、APIに送信
- 楽観的UI更新なし（API完了後にrefetch）

---

## 6. 不整合・実装漏れの一覧

### 6.1 重大な不整合

| No | 種類 | 内容 | 影響 |
|----|------|------|------|
| 1 | 型不整合 | **CreateTagCategoryRequest** にフロントエンドで `description`, `color` フィールドが定義されているが、バックエンドには存在しない | カテゴリ作成時に無視される |
| 2 | 型不整合 | **CreateTagRequest** にフロントエンドで `sortOrder` が含まれていないが、バックエンドでは受け付ける | 新規タグ作成時にsortOrderを指定できない |
| 3 | フィールド欠落 | **TagCategory** にフロントエンドで `code` が定義されているが、**CreateTagCategoryRequest** には含まれていない | カテゴリ作成時にcodeを指定できない |
| 4 | 権限不整合 | タグ管理画面はADMINのみアクセス可だが、API権限はEDITORでも可 | EDITORはAPIを直接叩けば操作可能 |

### 6.2 中程度の問題

| No | 種類 | 内容 | 影響 |
|----|------|------|------|
| 5 | 実装漏れ | タグ一覧APIにページネーション情報が含まれていない | limit=1000で対応しているが、大量データ時に問題 |
| 6 | 実装漏れ | カテゴリ詳細取得エンドポイント（`/tags/categories/:id`）がフロントエンドで定義されているがバックエンドに存在しない | 使用されていないが、一貫性がない |
| 7 | 未使用フィールド | TagSearchParams に `keyword`, `page` が定義されているが、バックエンドAPIでサポートされていない | 検索機能が不完全 |
| 8 | ルーティング問題 | `/api/tags/reorder` と `/api/tags/:id` のルーティング競合の可能性 | 現状は動作しているが要注意 |

### 6.3 軽微な問題

| No | 種類 | 内容 | 影響 |
|----|------|------|------|
| 9 | コメント不整合 | APIコメントに「admin」と記載されているが、実際は「admin/editor」 | 混乱を招く可能性 |
| 10 | 型精度 | `useTagCategories` のレスポンス型が `TagCategory[] | PaginatedResponse<TagCategory>` と曖昧 | 型安全性が低下 |
| 11 | 未定義ラベル | CLAUDE.mdのスキルレベル説明（未経験/微経験(1～3年未満)/中堅(3～5年)/ベテラン(5年以上)）と実際のEnumラベル（初級/中級/上級/エキスパート）が不一致 | ドキュメントの誤り |

---

## 7. フィールドマッピング一覧

### 7.1 TagCategory

| DB (schema.prisma) | Backend API | Frontend Type | 備考 |
|-------------------|-------------|---------------|------|
| id | id | id | OK |
| code | code | code | CreateRequestに不足 |
| name | name | name | OK |
| parentId | parentId | parentId | OK |
| sortOrder | sortOrder | sortOrder | OK |
| createdAt | createdAt | createdAt | OK |
| - | tags | tags? | OK |
| - | children | children? | OK |
| - | - | description? | **FEのみ** |
| - | - | color? | **FEのみ** |

### 7.2 Tag

| DB (schema.prisma) | Backend API | Frontend Type | 備考 |
|-------------------|-------------|---------------|------|
| id | id | id | OK |
| categoryId | categoryId | categoryId | OK |
| name | name | name | OK |
| sortOrder | sortOrder | sortOrder | CreateRequestに不足 |
| createdAt | createdAt | createdAt | OK |
| - | category | category? | OK |

### 7.3 EmployeeSkill

| DB (schema.prisma) | Backend API | Frontend Type | 備考 |
|-------------------|-------------|---------------|------|
| id | id | id | OK |
| employeeId | employeeId | employeeId | OK |
| tagId | tagId | tagId | OK |
| level | level | level | OK |
| createdAt | createdAt | createdAt | OK |
| - | tag | tag? | OK |

---

## 8. 推奨される修正事項

### 8.1 優先度: 高

1. **CreateTagCategoryRequest の修正**
   - `code` フィールドを追加（必須）
   - `description`, `color` フィールドを削除（または将来の拡張として残す場合はDBにも追加）

2. **CreateTagRequest の修正**
   - `sortOrder` フィールドを追加（任意）

3. **権限の統一**
   - タグ管理画面のアクセス権限をEDITOR以上に変更、または
   - API権限をADMINのみに変更

### 8.2 優先度: 中

4. **タグ一覧APIのページネーション追加**
   - 現状の `limit: 1000` は一時的な対応
   - 正式なページネーション対応が必要

5. **タグ検索機能の実装**
   - `keyword` パラメータのバックエンド対応

6. **カテゴリ詳細APIの実装または削除**
   - フロントエンドの `tagCategories.detail` を削除するか、バックエンドに実装

### 8.3 優先度: 低

7. **APIコメントの修正**
   - 「admin」→「admin/editor」に統一

8. **CLAUDE.mdのスキルレベル説明の修正**
   - 実際のラベルに合わせて更新

---

## 9. 関連ファイル一覧

| ファイルパス | 用途 |
|------------|------|
| `backend/prisma/schema.prisma` | データベーススキーマ定義 |
| `backend/src/routes/tags.ts` | タグ/カテゴリAPI |
| `backend/src/routes/employees.ts` | 社員スキルAPI |
| `frontend/src/types/index.ts` | 型定義 |
| `frontend/src/hooks/useTags.ts` | カスタムフック |
| `frontend/src/pages/TagManagement.tsx` | タグ管理画面 |
| `frontend/src/api/config.ts` | APIエンドポイント設定 |

---

## 10. 結論

タグモジュールの基本機能は正しく実装されていますが、フロントエンドとバックエンド間でいくつかの型定義の不整合が存在します。特に `CreateTagCategoryRequest` の `code` フィールドの欠落と `description`/`color` の不要なフィールドは修正が必要です。

また、タグ管理画面のアクセス権限（ADMIN）とAPI権限（EDITOR以上）の不一致についても、意図的な設計かどうか確認が必要です。

ページネーションと検索機能については、現在のデータ量では問題ありませんが、スケーラビリティを考慮すると将来的な対応が推奨されます。

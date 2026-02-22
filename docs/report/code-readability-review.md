# コード可読性評価レポート

**プロジェクト**: EmployeeDB2026（社員データベース Webアプリケーション）
**評価日**: 2026-02-22
**評価対象**: フロントエンド・バックエンド全ソースコード

---

## 総合評価

| 領域 | スコア | 判定 |
|------|:------:|------|
| バックエンド | **4.1 / 5** | 良好 |
| フロントエンド | **3.5 / 5** | 良好（構造的改善の余地あり） |
| **プロジェクト全体** | **3.8 / 5** | **良好** |

---

## 目次

1. [評価サマリー](#1-評価サマリー)
2. [バックエンド評価詳細](#2-バックエンド評価詳細)
3. [フロントエンド評価詳細](#3-フロントエンド評価詳細)
4. [横断的な課題](#4-横断的な課題)
5. [改善提案（優先度別）](#5-改善提案優先度別)

---

## 1. 評価サマリー

### 1.1 評価基準

各項目を5段階で評価:

| スコア | 判定 | 説明 |
|:------:|------|------|
| 5 | 優秀 | ベストプラクティスに準拠、改善不要 |
| 4 | 良好 | 一部改善点はあるが品質が高い |
| 3 | 普通 | 動作するが構造的な改善が必要 |
| 2 | 要改善 | 可読性に問題、リファクタリング必要 |
| 1 | 不良 | 根本的な見直しが必要 |

### 1.2 カテゴリ別スコア一覧

| 評価項目 | バックエンド | フロントエンド | 平均 |
|----------|:----------:|:------------:|:----:|
| 命名規則 | 5.0 | 4.0 | 4.5 |
| 関数/コンポーネントサイズ | 3.0 | 3.0 | 3.0 |
| コメント | 3.8 | 3.5 | 3.7 |
| コード重複 | 2.7 | 2.5 | 2.6 |
| エラーハンドリング/状態管理 | 4.2 | 3.0 | 3.6 |
| 型安全性 | 4.5 | 4.0 | 4.3 |
| ファイル構成 | 4.2 | 3.0 | 3.6 |
| マジック値/文字列 | 3.8 | 2.5 | 3.2 |
| フォーマット一貫性 | 5.0 | 4.0 | 4.5 |
| import組織化 | 5.0 | 4.0 | 4.5 |

### 1.3 強みと弱みの概観

**強み:**
- 命名規則が全体的に統一されており、コードの意図が読み取りやすい
- TypeScriptの型定義が充実しており型安全性が高い
- フォーマット（インデント、セミコロン、括弧スタイル）が一貫している
- Prismaスキーマの設計が優れており、コメントも充実

**弱み:**
- コード重複がプロジェクト全体で最大の課題
- 一部のファイルが大きすぎる（関数長・コンポーネントサイズ）
- マジックナンバー/文字列の定数化が不十分

---

## 2. バックエンド評価詳細

### 2.1 ファイル別スコア

| ファイル | スコア | 特記事項 |
|---------|:------:|---------|
| `src/lib/prisma.ts` | 4.8 | シングルトンパターン、コメント充実 |
| `prisma/schema.prisma` | 4.8 | インデックス・コメント・Enum設計が優秀 |
| `src/index.ts` | 4.6 | セクション区分が明確、CORS設定が丁寧 |
| `src/middleware/auth.ts` | 4.6 | JSDoc充実、JWT検証が堅牢 |
| `src/routes/auth.ts` | 4.4 | bcrypt処理が適切 |
| `src/routes/tags.ts` | 4.4 | 階層構造バリデーションが充実 |
| `src/middleware/errorHandler.ts` | 4.4 | Prismaエラー処理が包括的 |
| `src/routes/employees.ts` | 4.1 | 検索機能が優秀だが関数が長い |
| `src/routes/users.ts` | 4.1 | 簡潔だがany型使用あり |
| `src/routes/projects.ts` | 3.9 | 関数長超過、コード重複 |
| `src/routes/companies.ts` | 3.7 | 最大のコード重複箇所 |
| `src/routes/import.ts` | 3.7 | プレビュー/インポートの重複 |
| `prisma/seed.ts` | 3.7 | main関数が1325行 |

### 2.2 良い点（具体例）

#### 明確なセクション区分（`src/index.ts`）
```typescript
// ============================================
// ミドルウェア設定
// ============================================
```
ファイル全体がセクションコメントで論理的に区分されており、見通しが良い。

#### 堅牢なJWT検証（`src/middleware/auth.ts`）
```typescript
// TokenExpiredError と JsonWebTokenError を個別に処理
// それぞれ適切なエラーコードで応答
```
エラー種別に応じた細かい処理分岐があり、デバッグ時の原因特定が容易。

#### 充実したPrismaスキーマ（`prisma/schema.prisma`）
```prisma
/// 企業マスタ
model Company {
  // 日本語コメント付きでフィールドの意図が明確
  // インデックスも検索パターンに合わせて適切に定義
}
```

#### Zodによる入力バリデーション
全ルートファイルでZodスキーマによる入力検証が統一されており、バリデーションルールがコードとして明示的。

### 2.3 問題点（具体例）

#### 問題1: 関数長の超過

以下のルートハンドラーが50行を大きく超過:

| ファイル | エンドポイント | 行数 | 推奨上限 |
|---------|--------------|:----:|:--------:|
| `routes/companies.ts` | `PUT /:id` | 109行 | 50行 |
| `routes/companies.ts` | `POST /` | 79行 | 50行 |
| `routes/projects.ts` | `POST /:pid/assignments` | 82行 | 50行 |
| `routes/projects.ts` | `POST /` | 74行 | 50行 |
| `routes/projects.ts` | `PUT /:id` | 68行 | 50行 |
| `routes/employees.ts` | `GET /` | 52行 | 50行 |
| `prisma/seed.ts` | `main()` | **1325行** | 50行 |

#### 問題2: コード重複

**auth.ts の権限チェック:**
`requireAdmin` と `requireEditor` はロールチェック以外ほぼ同一。

```typescript
// 現状: 2つの関数がほぼ同じ構造
export const requireAdmin = (req, res, next) => {
  if (!req.user) { /* 401 */ }
  if (req.user.role !== 'ADMIN') { /* 403 */ }
  next();
};
export const requireEditor = (req, res, next) => {
  if (!req.user) { /* 401 */ }
  if (req.user.role !== 'ADMIN' && req.user.role !== 'EDITOR') { /* 403 */ }
  next();
};

// 改善案: ファクトリー関数
const requireRole = (...roles: UserRole[]) => (req, res, next) => {
  if (!req.user) { /* 401 */ }
  if (!roles.includes(req.user.role)) { /* 403 */ }
  next();
};
export const requireAdmin = requireRole('ADMIN');
export const requireEditor = requireRole('ADMIN', 'EDITOR');
```

**companies.ts の拠点・担当窓口の作成/更新:**
企業作成と更新で拠点・担当窓口の処理が3箇所以上で重複。

**import.ts のプレビュー/インポート:**
プレビューとインポートのメイン処理ロジックがほぼ同一構造。

**日付フィールド変換:**
`employees.ts`、`projects.ts` の複数箇所で同一の日付変換処理。

#### 問題3: any型の使用

```typescript
// routes/users.ts L177
const updateData: any = {};
// → Prisma.UserUpdateInput を使用すべき
```

#### 問題4: 型アサーションの多用

```typescript
// routes/projects.ts
data.status as ProjectStatus  // 複数箇所で使用
// → Zodスキーマ側で型変換すべき
```

---

## 3. フロントエンド評価詳細

### 3.1 カテゴリ別スコア

| 評価項目 | スコア | 状態 |
|----------|:------:|------|
| 命名規則 | 4.0 | 良好 |
| コンポーネントサイズ | 3.0 | 改善必要 |
| コメント | 3.5 | やや不足 |
| コード重複 | 2.5 | 要リファクタリング |
| 状態管理 | 3.0 | 改善必要 |
| 型安全性 | 4.0 | 良好 |
| Propsインターフェース | 4.5 | 良好 |
| JSX可読性 | 3.5 | 改善必要 |
| マジック値/文字列 | 2.5 | 要改善 |
| フォーマット一貫性 | 4.0 | 良好 |
| import組織化 | 4.0 | 良好 |
| 関心の分離 | 3.0 | 改善必要 |

### 3.2 良い点（具体例）

#### 統一された型定義体系（`types/index.ts`）
600行以上の包括的な型定義により、フロントエンド全体で型安全性が確保されている。Enumのラベルマッピングも一元管理。

#### Propsインターフェースの充実
ほぼ全コンポーネントで明確なProps型が定義されており、コンポーネントの使い方が型から読み取れる。

#### カスタムフックによるデータ取得の統一
`useEmployees`, `useTags`, `useCompanies`, `useProjects` でデータ取得パターンが統一。React Queryのキャッシュ戦略も一貫。

#### import組織の整合性
```tsx
// 典型的なimport順序（一貫して遵守）
import { useState } from 'react';           // 1. React
import { useNavigate } from 'react-router'; // 2. ライブラリ
import { Button } from '@/components/ui';    // 3. コンポーネント
import { useAuth } from '@/hooks/useAuth';   // 4. フック
import type { Employee } from '@/types';     // 5. 型
```

### 3.3 問題点（具体例）

#### 問題1: コンポーネントサイズの超過

| ファイル | 行数 | 推奨上限 | 分割提案 |
|---------|:----:|:--------:|---------|
| `pages/CompanyDetail.tsx` | 648行 | 300行 | 部署/拠点/担当窓口/案件の各セクションを分離 |
| `pages/EmployeeForm.tsx` | 520行 | 300行 | 基本情報/組織情報/住所/スキルの各フォームセクションを分離 |
| `pages/EmployeeList.tsx` | 475行 | 300行 | ページネーション・フィルターを共通コンポーネント化 |
| `pages/EmployeeDetail.tsx` | 475行 | 300行 | スキルセクション・参画履歴セクションを分離 |
| `pages/CompanyForm.tsx` | 455行 | 300行 | 拠点・担当窓口の動的フォームを分離 |
| `pages/ProjectDetail.tsx` | 590行 | 300行 | アサインモーダル・一覧を分離 |

#### 問題2: コード重複（最大の課題）

**ページネーション実装が4箇所で重複:**
`EmployeeList.tsx`、`CompanyList.tsx`、`ProjectList.tsx`、`ProjectDetail.tsx` でほぼ同一のページネーションUIが繰り返される。

```tsx
// 4箇所で繰り返されるパターン
<div className="flex items-center justify-between">
  <span>全{total}件中...</span>
  <div className="flex gap-1">
    <button onClick={() => setPage(p - 1)} disabled={page === 1}>前へ</button>
    {/* ページ番号ボタン */}
    <button onClick={() => setPage(p + 1)} disabled={page === totalPages}>次へ</button>
  </div>
</div>
```

**ローディング/エラー表示が複数箇所で重複:**
```tsx
// 複数ページで繰り返されるパターン
{isLoading ? (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
) : error ? (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <p>データの取得に失敗しました</p>
  </div>
) : /* 本体 */}
```

**日付フォーマット関数の分散:**
同一の日付変換ロジックが `EmployeeDetailPanel.tsx`、`ProjectDetail.tsx`、`CompanyDetail.tsx` 等に散在。

#### 問題3: 過度なuseState（`ProjectDetail.tsx`）

```tsx
// アサイン追加用に8個のuseState
const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);
const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
const [assignmentRole, setAssignmentRole] = useState('');
const [assignmentStartDate, setAssignmentStartDate] = useState('');
const [assignmentEndDate, setAssignmentEndDate] = useState('');
const [assignmentWorkload, setAssignmentWorkload] = useState('100');
const [assignmentRemark, setAssignmentRemark] = useState('');
const [assignmentDateError, setAssignmentDateError] = useState('');

// さらに編集用に同じ8個のuseState（計16個）
```

`useReducer` またはフォームオブジェクトでの統合が推奨される。

#### 問題4: マジックナンバー/文字列

| ファイル | 箇所 | 値 | 改善案 |
|---------|------|-----|--------|
| `EmployeeList.tsx` | ページサイズ | `12` | `EMPLOYEES_PER_PAGE` 定数化 |
| `EmployeeFilter.tsx` | デバウンス | `300` ms | `DEBOUNCE_DELAY_MS` 定数化 |
| `ProjectDetail.tsx` | 初期稼働率 | `'100'` | `DEFAULT_WORKLOAD` 定数化 |
| `Header.tsx` | アクティブタブ色 | `#006CBE` | CSS変数 or Tailwind設定 |
| `useCompanies.ts` | 取得上限 | `100` | `MAX_DROPDOWN_ITEMS` 定数化 |
| 各一覧ページ | デフォルト件数 | `20` | `DEFAULT_PAGE_SIZE` 定数化 |

#### 問題5: 関心の分離

```tsx
// EmployeeDetail.tsx - UIコンポーネント内にビジネスロジック
employee.skills
  .filter(s => s.tag?.name)
  .reduce<Record<string, EmployeeSkill[]>>((acc, skill) => {
    const categoryName = skill.tag?.category?.name || 'その他';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(skill);
    return acc;
  }, {})
```

スキルのカテゴリ別グループ化ロジックがJSX内にインラインで記述されており、テスト不能かつ読みにくい。ユーティリティ関数またはカスタムフックに切り出すべき。

#### 問題6: any型の使用

```tsx
// CompanyList.tsx
status: status as any || undefined,

// ProjectDetail.tsx (CompanyDetail.tsx内の案件一覧)
{projectsData?.data.map((project: any) => (
```

---

## 4. 横断的な課題

### 4.1 コード重複（プロジェクト全体）

コード重複はプロジェクト全体で **最も深刻な課題** であり、スコア平均 **2.6/5** と低い。

| 重複パターン | 発生箇所 | 影響度 |
|-------------|---------|:------:|
| ページネーションUI | FE: 4ページ | 高 |
| ローディング/エラー表示 | FE: 5ページ以上 | 高 |
| 日付フォーマット | FE+BE: 6箇所以上 | 中 |
| 権限チェックミドルウェア | BE: auth.ts | 低 |
| 拠点/担当窓口のCRUD | BE: companies.ts | 高 |
| プレビュー/インポート処理 | BE: import.ts | 中 |
| 日付バリデーション | BE: projects.ts, employees.ts | 中 |
| bcrypt比較処理 | BE: auth.ts, users.ts | 低 |

### 4.2 ファイルサイズ

300行超のファイルが多く、コード分割の余地が大きい。

**バックエンド:**
- `prisma/seed.ts`: 1325行（要分割）
- `routes/companies.ts`: 900行超（要分割）
- `routes/projects.ts`: 600行超（要分割）
- `routes/employees.ts`: 500行超（中程度）

**フロントエンド:**
- `types/index.ts`: 600行超（ドメイン別に分割推奨）
- `pages/CompanyDetail.tsx`: 648行（セクション分離推奨）
- `pages/ProjectDetail.tsx`: 590行
- `pages/EmployeeForm.tsx`: 520行
- `pages/EmployeeList.tsx`: 475行
- `pages/EmployeeDetail.tsx`: 475行

### 4.3 マジック値の散在

定数が一元管理されておらず、各ファイルにハードコードされた値が散在。ページサイズ、デバウンス時間、ファイルサイズ上限、色コードなど。

---

## 5. 改善提案（優先度別）

### P0: 高優先度（可読性・保守性に直結）

#### 5.1 共通コンポーネントの抽出（フロントエンド）

```
新規作成:
  components/ui/Pagination.tsx       ← 4箇所のページネーションを統合
  components/ui/LoadingSpinner.tsx   ← ローディング表示の共通化
  components/ui/ErrorMessage.tsx     ← エラー表示の共通化
  components/ui/EmptyState.tsx       ← 空状態表示の共通化
  components/ui/ConfirmDialog.tsx    ← 削除確認ダイアログの共通化
```

#### 5.2 大規模コンポーネントの分割（フロントエンド）

```
CompanyDetail.tsx を分割:
  → CompanyInfoCard.tsx
  → CompanyOfficesSection.tsx
  → CompanyDepartmentTree.tsx
  → CompanyContactsSection.tsx
  → CompanyProjectsSection.tsx

ProjectDetail.tsx を分割:
  → ProjectInfoCard.tsx
  → ProjectAssignmentList.tsx
  → AssignmentFormModal.tsx
```

#### 5.3 ルートハンドラーの関数抽出（バックエンド）

```
routes/companies.ts:
  → services/companyService.ts に拠点・担当窓口のCRUDロジックを抽出

routes/projects.ts:
  → services/projectService.ts に日付バリデーション・データ変換を抽出

routes/employees.ts:
  → helpers/searchBuilder.ts に検索条件構築ロジックを抽出
```

### P1: 中優先度（品質向上）

#### 5.4 定数ファイルの作成

```typescript
// frontend/src/constants/index.ts
export const EMPLOYEES_PER_PAGE = 12;
export const DEFAULT_PAGE_SIZE = 20;
export const DEBOUNCE_DELAY_MS = 300;
export const DEFAULT_WORKLOAD_PERCENTAGE = 100;
export const MAX_DROPDOWN_ITEMS = 100;

// backend/src/constants/index.ts
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
export const BCRYPT_SALT_ROUNDS = 10;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
```

#### 5.5 ユーティリティ関数の共通化

```typescript
// frontend/src/utils/dateUtils.ts
export const formatDate = (dateStr: string): string => { ... }
export const formatDateRange = (start: string, end?: string): string => { ... }
export const toInputDateFormat = (isoDate: string): string => { ... }

// backend/src/utils/dateUtils.ts
export const parseDateField = (value: unknown): Date | undefined => { ... }
export const validateDateRange = (start: Date, end: Date): boolean => { ... }
```

#### 5.6 any型の排除

```typescript
// routes/users.ts: any → Prisma型
const updateData: Prisma.UserUpdateInput = {};

// フロントエンド: as any → 適切な型
status: status as CompanyStatus || undefined
```

#### 5.7 seed.tsの分割

```typescript
// prisma/seed.ts → 複数ファイルに分割
prisma/seeds/categories.ts   // タグカテゴリ・タグ
prisma/seeds/users.ts        // ユーザー
prisma/seeds/employees.ts    // 社員・スキル
prisma/seeds/companies.ts    // 企業・拠点・部署・担当窓口
prisma/seeds/projects.ts     // 案件・参画
```

### P2: 低優先度（さらなる改善）

#### 5.8 型定義ファイルの分割

```
frontend/src/types/index.ts を分割:
  → types/employee.ts
  → types/company.ts
  → types/project.ts
  → types/tag.ts
  → types/auth.ts
  → types/common.ts    ← PaginatedResponse, ApiError等
  → types/index.ts     ← re-export のみ
```

#### 5.9 状態管理の改善

```typescript
// ProjectDetail.tsx: 16個のuseStateをuseReducerに統合
type AssignmentFormState = {
  employeeId: string;
  role: string;
  startDate: string;
  endDate: string;
  workload: string;
  remark: string;
  dateError: string;
};

const [formState, dispatch] = useReducer(assignmentFormReducer, initialState);
```

#### 5.10 コメントの充実

以下の箇所にコメントを追加推奨:
- `App.tsx`: ルート定義の権限要件
- `CompanyDetail.tsx`: 部署ツリー構築ロジック
- `EmployeeFilter.tsx`: 検索条件の結合ロジック
- `routes/employees.ts`: スペース区切りAND検索の動作説明

---

## 付録: ファイル別スコア一覧

### バックエンド

| ファイル | 命名 | 関数長 | コメント | 重複 | エラー | 型安全 | 構成 | マジック値 | 書式 | import | 総合 |
|---------|:----:|:-----:|:------:|:----:|:-----:|:-----:|:----:|:--------:|:----:|:-----:|:----:|
| src/lib/prisma.ts | 5 | 5 | 5 | 5 | 4 | 5 | 5 | 4 | 5 | 5 | **4.8** |
| prisma/schema.prisma | 5 | - | 5 | - | - | 5 | 5 | - | 5 | - | **4.8** |
| src/index.ts | 5 | 5 | 4 | 4 | 4 | 5 | 5 | 4 | 5 | 5 | **4.6** |
| src/middleware/auth.ts | 5 | 4 | 5 | 3 | 5 | 5 | 5 | 4 | 5 | 5 | **4.6** |
| src/routes/auth.ts | 5 | 4 | 4 | 3 | 5 | 5 | 5 | 4 | 5 | 5 | **4.4** |
| src/routes/tags.ts | 5 | 4 | 4 | 3 | 4 | 5 | 5 | 4 | 5 | 5 | **4.4** |
| src/middleware/errorHandler.ts | 5 | 4 | 3 | 4 | 5 | 4 | 5 | 5 | 5 | 5 | **4.4** |
| src/routes/employees.ts | 5 | 3 | 4 | 3 | 4 | 5 | 4 | 3 | 5 | 5 | **4.1** |
| src/routes/users.ts | 5 | 4 | 3 | 3 | 4 | 3 | 4 | 5 | 5 | 5 | **4.1** |
| src/routes/projects.ts | 5 | 2 | 4 | 2 | 4 | 4 | 3 | 5 | 5 | 5 | **3.9** |
| src/routes/companies.ts | 5 | 2 | 3 | 2 | 4 | 4 | 3 | 4 | 5 | 5 | **3.7** |
| src/routes/import.ts | 5 | 3 | 3 | 2 | 4 | 4 | 3 | 3 | 5 | 5 | **3.7** |
| prisma/seed.ts | 5 | 2 | 4 | 2 | 4 | 5 | 2 | 2 | 5 | 5 | **3.7** |

### フロントエンド

| ファイル | 命名 | サイズ | コメント | 重複 | 状態管理 | 型安全 | JSX | マジック値 | 書式 | 関心分離 | 総合 |
|---------|:----:|:-----:|:------:|:----:|:-------:|:-----:|:---:|:--------:|:----:|:-------:|:----:|
| components/ui/* | 5 | 5 | 4 | 5 | - | 5 | 5 | 5 | 5 | 5 | **4.9** |
| hooks/useAuth.tsx | 5 | 4 | 4 | 4 | 4 | 5 | - | 4 | 5 | 4 | **4.3** |
| hooks/useEmployees.ts | 5 | 5 | 3 | 4 | 4 | 5 | - | 4 | 5 | 4 | **4.3** |
| hooks/useTags.ts | 5 | 5 | 4 | 4 | 4 | 5 | - | 4 | 5 | 4 | **4.3** |
| types/index.ts | 5 | 3 | 4 | 5 | - | 5 | - | 5 | 4 | - | **4.3** |
| App.tsx | 5 | 4 | 3 | 4 | - | 5 | 4 | 5 | 5 | 5 | **4.2** |
| components/employee/* | 4 | 4 | 4 | 3 | 3 | 4 | 4 | 3 | 4 | 3 | **3.6** |
| pages/CompanyList.tsx | 4 | 4 | 3 | 2 | 3 | 3 | 4 | 3 | 4 | 3 | **3.3** |
| pages/ProjectList.tsx | 4 | 4 | 3 | 2 | 3 | 4 | 4 | 3 | 4 | 3 | **3.4** |
| pages/EmployeeList.tsx | 4 | 2 | 3 | 2 | 3 | 4 | 3 | 2 | 4 | 3 | **3.0** |
| pages/EmployeeDetail.tsx | 4 | 2 | 3 | 3 | 3 | 4 | 3 | 3 | 4 | 2 | **3.1** |
| pages/EmployeeForm.tsx | 4 | 2 | 3 | 3 | 3 | 4 | 3 | 2 | 4 | 3 | **3.1** |
| pages/CompanyDetail.tsx | 4 | 1 | 3 | 2 | 3 | 3 | 3 | 3 | 4 | 2 | **2.8** |
| pages/ProjectDetail.tsx | 4 | 2 | 3 | 2 | 2 | 3 | 3 | 2 | 4 | 2 | **2.7** |

---

**以上**

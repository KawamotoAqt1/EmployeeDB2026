# コード可読性 段階的修正プラン

**作成日**: 2026-02-22
**対象レポート**: `docs/report/code-readability-review.md`
**全体スコア**: 3.8/5 → 目標 4.3/5

---

## 修正方針

- レポートの優先度 P0 → P1 → P2 の順に段階的に修正
- 各ステップは独立してマージ可能な単位に分割
- 既存の動作を壊さないよう、リファクタリングのみ（機能追加なし）
- 各ステップ完了後にビルド確認を実施

---

## Phase 1: P0 高優先度（コード重複の解消・大規模ファイル分割）

### Step 1-1: 共通UIコンポーネントの抽出（フロントエンド）

**対象スコア**: コード重複 2.5 → 4.0

#### 1-1a: Pagination コンポーネント

**重複箇所**:
- `pages/EmployeeList.tsx` L170-201（デスクトップ版ページネーション）
- `pages/CompanyList.tsx` L284-310
- `pages/ProjectList.tsx` L282-308

**作業内容**:
1. `frontend/src/components/ui/Pagination.tsx` を新規作成
   - Props: `currentPage`, `totalPages`, `totalItems`, `limit`, `onPageChange`
   - デスクトップ版（番号ボタン付き）とモバイル版（前へ/次へ）を内包
2. `EmployeeList.tsx` のページネーション部分を `<Pagination />` に置換
3. `CompanyList.tsx` のページネーション部分を置換
4. `ProjectList.tsx` のページネーション部分を置換

**新規ファイル**: `frontend/src/components/ui/Pagination.tsx`
**修正ファイル**: `EmployeeList.tsx`, `CompanyList.tsx`, `ProjectList.tsx`
**削減見込み**: 約90行（各30行 × 3箇所）

---

#### 1-1b: LoadingState / ErrorMessage / EmptyState コンポーネント

**重複箇所**:
- `EmployeeList.tsx` L252-286（ローディング・エラー・空状態）
- `CompanyList.tsx` L134-149
- `ProjectList.tsx` L140-177
- `EmployeeDetail.tsx`, `CompanyDetail.tsx`, `ProjectDetail.tsx` にも同パターン

**作業内容**:
1. `frontend/src/components/ui/LoadingSpinner.tsx` を新規作成
   - 既存のスピナーCSS（`animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600`）を共通化
2. `frontend/src/components/ui/ErrorMessage.tsx` を新規作成
   - Props: `message?`, `onRetry?`
3. `frontend/src/components/ui/EmptyState.tsx` を新規作成
   - Props: `icon?`, `title`, `description?`, `action?`
4. 各ページの該当箇所を共通コンポーネントに置換
5. `frontend/src/components/ui/index.ts` にexportを追加

**新規ファイル**: `LoadingSpinner.tsx`, `ErrorMessage.tsx`, `EmptyState.tsx`
**修正ファイル**: 全一覧ページ、全詳細ページ（6ファイル以上）
**削減見込み**: 約120行

---

#### 1-1c: ConfirmDialog コンポーネント

**重複箇所**: 削除確認ダイアログが各詳細ページに個別実装

**作業内容**:
1. `frontend/src/components/ui/ConfirmDialog.tsx` を新規作成
   - Props: `isOpen`, `title`, `message`, `confirmLabel`, `onConfirm`, `onCancel`, `variant?`（danger/warning）
2. 各ページの削除確認ダイアログを置換

**新規ファイル**: `ConfirmDialog.tsx`
**修正ファイル**: `CompanyDetail.tsx`, `ProjectDetail.tsx`, `EmployeeDetail.tsx`
**削減見込み**: 約60行

---

### Step 1-2: ProjectDetail.tsx の分割（フロントエンド・最低スコアファイル）

**対象ファイル**: `pages/ProjectDetail.tsx`（592行、総合スコア 2.7）
**対象スコア**: コンポーネントサイズ 2→4, 状態管理 2→4, 関心の分離 2→4

#### 1-2a: アサインメントフォーム状態の統合

**問題**: useState が16個（L23-41）、追加用8個 + 編集用8個が重複

**作業内容**:
1. `frontend/src/hooks/useAssignmentForm.ts` を新規作成
   - アサインメントフォームの状態を1つのオブジェクトにまとめる
   - `resetForm()`, `setField()`, `validate()` メソッドを提供
   - 追加/編集の両方で再利用可能に
2. `ProjectDetail.tsx` の16個のuseStateをカスタムフックに置換

**新規ファイル**: `frontend/src/hooks/useAssignmentForm.ts`

---

#### 1-2b: AssignmentFormModal コンポーネントの抽出

**問題**: 追加フォーム（L370-487, 119行）と編集フォーム（L489-586, 100行）がほぼ同一

**作業内容**:
1. `frontend/src/components/project/AssignmentFormModal.tsx` を新規作成
   - Props: `mode: 'add' | 'edit'`, `formState`, `employees`, `onSubmit`, `onCancel`
   - 追加/編集で共通のフォームUI
2. `ProjectDetail.tsx` の2つのモーダルを1つのコンポーネントに置換

**新規ファイル**: `frontend/src/components/project/AssignmentFormModal.tsx`
**削減見込み**: 約100行（重複フォーム統合）

---

#### 1-2c: ProjectAssignmentList コンポーネントの抽出

**作業内容**:
1. `frontend/src/components/project/ProjectAssignmentList.tsx` を新規作成
   - アサインメント一覧テーブル + ページネーション
2. `ProjectDetail.tsx` からアサインメント一覧セクションを分離

**新規ファイル**: `frontend/src/components/project/ProjectAssignmentList.tsx`
**修正後の `ProjectDetail.tsx`**: 約250行（592行 → 250行）

---

### Step 1-3: CompanyDetail.tsx の分割（フロントエンド）

**対象ファイル**: `pages/CompanyDetail.tsx`（648行、総合スコア 2.8）

**作業内容**:
1. `frontend/src/components/company/CompanyOfficeList.tsx` を新規作成
   - 拠点一覧セクション（L362-411）
2. `frontend/src/components/company/CompanyDepartmentTree.tsx` を新規作成
   - 部署ツリー構築ロジック（L154-205）+ 表示（L413-441）
3. `frontend/src/components/company/CompanyContactList.tsx` を新規作成
   - 担当窓口一覧セクション（L443-513）
4. `frontend/src/components/company/CompanyProjectList.tsx` を新規作成
   - 関連案件一覧セクション（L515-547）
5. `frontend/src/hooks/useDepartmentForm.ts` を新規作成
   - 部署フォーム関連のuseState（L47-56）を統合

**新規ファイル**: 4コンポーネント + 1フック
**修正後の `CompanyDetail.tsx`**: 約200行（648行 → 200行）

---

### Step 1-4: ルートハンドラーの関数抽出（バックエンド）

**対象スコア**: 関数長 2→4, コード重複 2→4

#### 1-4a: 権限チェックミドルウェアのファクトリー化

**対象ファイル**: `backend/src/middleware/auth.ts`（223行）
**問題**: `requireAdmin`（L137-165）と `requireEditor`（L171-199）がほぼ同一

**作業内容**:
1. `requireRole(...roles)` ファクトリー関数を作成
2. `requireAdmin` と `requireEditor` をファクトリーから生成
3. 既存のexport名は維持（破壊的変更なし）

**修正ファイル**: `backend/src/middleware/auth.ts`
**削減見込み**: 約20行

---

#### 1-4b: companies.ts のサービス層抽出

**対象ファイル**: `backend/src/routes/companies.ts`（1114行、スコア 3.7）
**問題**: 拠点・担当窓口のCRUD処理が重複、PUT handler 109行

**作業内容**:
1. `backend/src/services/companyService.ts` を新規作成
   - `createCompanyWithRelations()` - 企業 + 拠点 + 担当窓口の一括作成
   - `updateCompanyWithRelations()` - 企業 + 拠点 + 担当窓口の一括更新
   - `transformOfficeData()` - 拠点データ変換（重複排除）
   - `transformContactData()` - 担当窓口データ変換（重複排除）
2. ルートハンドラーをサービス呼び出しに簡素化

**新規ファイル**: `backend/src/services/companyService.ts`
**修正ファイル**: `backend/src/routes/companies.ts`
**削減見込み**: 約200行

---

#### 1-4c: projects.ts のサービス層抽出

**対象ファイル**: `backend/src/routes/projects.ts`（633行、スコア 3.9）
**問題**: POST（74行）/PUT（68行）が長い、日付変換・型アサーションが重複

**作業内容**:
1. `backend/src/services/projectService.ts` を新規作成
   - `buildProjectData()` - 日付変換 + 型変換の共通化
   - `getProjectIncludes()` - 繰り返されるincludeパターンの定義
2. ルートハンドラーをサービス呼び出しに簡素化

**新規ファイル**: `backend/src/services/projectService.ts`
**修正ファイル**: `backend/src/routes/projects.ts`
**削減見込み**: 約80行

---

#### 1-4d: employees.ts の検索ロジック抽出

**対象ファイル**: `backend/src/routes/employees.ts`（674行、スコア 4.1）
**問題**: 検索条件構築ロジックが93行（L116-208）、includeパターンが4回以上重複

**作業内容**:
1. `backend/src/utils/searchBuilder.ts` を新規作成
   - `buildEmployeeSearchCondition()` - 検索条件構築の共通化
   - `EMPLOYEE_SEARCH_FIELDS` - 検索対象フィールド定数
2. `backend/src/utils/prismaIncludes.ts` を新規作成
   - `EMPLOYEE_WITH_SKILLS` - スキル付きincludeパターン定義
   - `PROJECT_WITH_RELATIONS` - 案件includeパターン定義
3. ルートハンドラーから抽出した関数を呼び出し

**新規ファイル**: `searchBuilder.ts`, `prismaIncludes.ts`
**修正ファイル**: `backend/src/routes/employees.ts`
**削減見込み**: 約100行

---

#### 1-4e: import.ts のプレビュー/インポート統合

**対象ファイル**: `backend/src/routes/import.ts`（352行、スコア 3.7）
**問題**: プレビュー（L173-232）とインポート（L238-350）のメイン処理が重複

**作業内容**:
1. 共通の `processImportData()` 関数を抽出
   - CSVパース → マッピング → バリデーションの共通フロー
   - `mode: 'preview' | 'import'` で分岐
2. `employeeData` 構築ロジックをヘルパー関数に抽出

**修正ファイル**: `backend/src/routes/import.ts`
**削減見込み**: 約50行

---

## Phase 2: P1 中優先度（品質向上）

### Step 2-1: 定数ファイルの作成

**対象スコア**: マジック値 2.5 → 4.0

#### フロントエンド

**作業内容**:
1. `frontend/src/constants/index.ts` を新規作成

```
定義する定数:
- EMPLOYEES_PER_PAGE = 12       ← EmployeeList.tsx L33
- DEFAULT_PAGE_SIZE = 20        ← CompanyList.tsx L22, ProjectList.tsx L23
- DEBOUNCE_DELAY_MS = 300       ← EmployeeFilter.tsx
- DEFAULT_WORKLOAD = '100'      ← ProjectDetail.tsx L29
- MAX_DROPDOWN_ITEMS = 100      ← useCompanies.ts
- DESKTOP_BREAKPOINT = 1024     ← EmployeeList.tsx L66
- MAX_PHOTO_SIZE = 5242880      ← EmployeeForm.tsx（5MB）
```

2. 各ファイルのハードコード値を定数参照に置換

**新規ファイル**: `frontend/src/constants/index.ts`
**修正ファイル**: 8ファイル以上

#### バックエンド

**作業内容**:
1. `backend/src/constants/index.ts` を新規作成

```
定義する定数:
- BCRYPT_SALT_ROUNDS = 10       ← auth.ts, users.ts
- DEFAULT_PAGE_SIZE = 20        ← employees.ts, companies.ts, projects.ts
- MAX_PAGE_SIZE = 100           ← 各ルートのZodスキーマ
- MAX_UPLOAD_SIZE = 5242880     ← employees.ts（5MB）
- JWT_EXPIRES_IN = '24h'        ← auth.ts
```

2. 各ファイルのハードコード値を定数参照に置換

**新規ファイル**: `backend/src/constants/index.ts`
**修正ファイル**: 6ファイル以上

---

### Step 2-2: ユーティリティ関数の共通化

#### 2-2a: 日付ユーティリティ（フロントエンド）

**問題**: 日付フォーマットが `EmployeeDetail.tsx`, `ProjectDetail.tsx`, `CompanyDetail.tsx` 等に散在

**作業内容**:
1. `frontend/src/utils/dateUtils.ts` を新規作成
   - `formatDate(dateStr)` - ISO日付 → 表示形式
   - `formatDateRange(start, end?)` - 期間表示
   - `toInputDateFormat(isoDate)` - input[type=date]用変換
2. 各ファイルのインライン日付フォーマットを置換

**新規ファイル**: `frontend/src/utils/dateUtils.ts`
**修正ファイル**: 5ファイル以上

---

#### 2-2b: 日付ユーティリティ（バックエンド）

**問題**: 日付変換パターンが `employees.ts`, `projects.ts` で重複

**作業内容**:
1. `backend/src/utils/dateUtils.ts` を新規作成
   - `parseDateField(value)` - 文字列 → Date変換
   - `validateDateRange(start, end)` - 日付範囲バリデーション
   - `toDateOrUndefined(value)` - nullsafe変換
2. 各ルートの日付変換コードを置換

**新規ファイル**: `backend/src/utils/dateUtils.ts`
**修正ファイル**: `employees.ts`, `projects.ts`, `import.ts`

---

### Step 2-3: any型の排除

**対象スコア**: 型安全性 向上

**修正箇所**:

| ファイル | 行 | 現状 | 修正後 |
|---------|:---:|------|--------|
| `backend/src/routes/users.ts` | L177 | `updateData: any = {}` | `updateData: Prisma.UserUpdateInput = {}` |
| `frontend/src/pages/CompanyList.tsx` | - | `status as any` | `status as CompanyStatus` |
| `frontend/src/pages/CompanyDetail.tsx` | - | `project: any` | 適切な型定義 |
| `backend/src/routes/projects.ts` | L267,335 | `as ContractTypeProject` | Zodスキーマで型変換 |
| `backend/src/routes/projects.ts` | L273,347 | `as ProjectStatus` | Zodスキーマで型変換 |
| `backend/src/routes/projects.ts` | L503,567 | `as AssignmentStatus` | Zodスキーマで型変換 |

**修正ファイル**: 4ファイル

---

### Step 2-4: seed.ts の分割（バックエンド）

**対象ファイル**: `backend/prisma/seed.ts`（1325行、main()関数が1306行）

**作業内容**:
1. `backend/prisma/seeds/` ディレクトリを作成
2. 以下のファイルに分割:

| ファイル | 元の行範囲 | 内容 |
|---------|-----------|------|
| `seeds/tagSeeds.ts` | L12-196 | タグカテゴリ + タグ（64件） |
| `seeds/userSeeds.ts` | L198-224 | 管理者ユーザー |
| `seeds/companySeeds.ts` | L226-662 | 企業 + 拠点 + 部署 + 担当窓口 |
| `seeds/employeeSeeds.ts` | L854-998 | 社員データ |
| `seeds/projectSeeds.ts` | L664-852, L1000-1282 | 案件 + アサインメント |

3. `seed.ts` を各seedファイルを順番に呼び出すオーケストレーターに変更

**新規ファイル**: 5ファイル
**修正ファイル**: `seed.ts`（1325行 → 約50行）

---

## Phase 3: P2 低優先度（さらなる改善）

### Step 3-1: 型定義ファイルの分割（フロントエンド）

**対象ファイル**: `frontend/src/types/index.ts`（613行）

**作業内容**:
1. ドメイン別に分割:

| ファイル | 内容 |
|---------|------|
| `types/employee.ts` | Employee, EmployeeSkill, EmployeeSearchParams等 |
| `types/company.ts` | Company, CompanyOffice, CompanyDepartment等 |
| `types/project.ts` | Project, ProjectAssignment等 |
| `types/tag.ts` | Tag, TagCategory, SkillLevel等 |
| `types/auth.ts` | User, UserRole, LoginRequest等 |
| `types/common.ts` | PaginatedResponse, ApiError, PaginationParams等 |
| `types/index.ts` | re-exportのみ |

2. `types/index.ts` を全型のre-exportハブとして維持（既存importへの影響なし）

**新規ファイル**: 6ファイル
**修正ファイル**: `types/index.ts`（re-exportのみに）

---

### Step 3-2: EmployeeForm.tsx の分割

**対象ファイル**: `pages/EmployeeForm.tsx`（520行）

**作業内容**:
1. `components/employee/BasicInfoSection.tsx` - 基本情報フォーム（氏名、カナ、生年月日等）
2. `components/employee/OrganizationSection.tsx` - 組織情報（部署、役職、勤務地等）
3. `components/employee/SkillSection.tsx` - スキルタグ選択セクション

**新規ファイル**: 3コンポーネント
**修正後の `EmployeeForm.tsx`**: 約200行

---

### Step 3-3: EmployeeDetail.tsx / EmployeeList.tsx の改善

#### EmployeeDetail.tsx（475行）

**作業内容**:
1. スキルカテゴリ別グループ化ロジック（インラインreduce）をユーティリティ関数に抽出
2. スキルセクション・参画履歴セクションをサブコンポーネントに分離

#### EmployeeList.tsx（476行）

**作業内容**:
1. Step 1-1a/1-1bで共通コンポーネント適用済みの前提
2. 残るマスター/ディテール切り替えロジックの整理

---

### Step 3-4: コメントの充実

**対象箇所**:
- `App.tsx` - ルート定義の権限要件コメント
- `CompanyDetail.tsx` - 部署ツリー構築ロジックのアルゴリズム説明
- `EmployeeFilter.tsx` - 検索条件の結合ロジック（AND/OR）の説明
- `routes/employees.ts` - スペース区切りAND検索の動作説明
- `routes/import.ts` - CSVカラムマッピングのフロー説明

---

## 実施スケジュール（目安）

| Phase | Step | 作業内容 | 新規ファイル | 修正ファイル |
|:-----:|:----:|---------|:----------:|:----------:|
| 1 | 1-1a | Pagination共通化 | 1 | 3 |
| 1 | 1-1b | Loading/Error/Empty共通化 | 3 | 6+ |
| 1 | 1-1c | ConfirmDialog共通化 | 1 | 3 |
| 1 | 1-2 | ProjectDetail分割 | 3 | 1 |
| 1 | 1-3 | CompanyDetail分割 | 5 | 1 |
| 1 | 1-4a | auth.tsファクトリー化 | 0 | 1 |
| 1 | 1-4b | companyService抽出 | 1 | 1 |
| 1 | 1-4c | projectService抽出 | 1 | 1 |
| 1 | 1-4d | searchBuilder抽出 | 2 | 1 |
| 1 | 1-4e | import.ts統合 | 0 | 1 |
| 2 | 2-1 | 定数ファイル作成 | 2 | 14+ |
| 2 | 2-2 | 日付ユーティリティ | 2 | 8+ |
| 2 | 2-3 | any型排除 | 0 | 4 |
| 2 | 2-4 | seed.ts分割 | 5 | 1 |
| 3 | 3-1 | 型定義分割 | 6 | 1 |
| 3 | 3-2 | EmployeeForm分割 | 3 | 1 |
| 3 | 3-3 | EmployeeDetail/List改善 | 2 | 2 |
| 3 | 3-4 | コメント充実 | 0 | 5 |

---

## 期待される改善効果

| カテゴリ | 現状スコア | Phase 1後 | Phase 2後 | Phase 3後 |
|---------|:--------:|:--------:|:--------:|:--------:|
| コード重複 | 2.6 | 3.8 | 4.2 | 4.3 |
| 関数/コンポーネントサイズ | 3.0 | 4.0 | 4.0 | 4.2 |
| マジック値 | 3.2 | 3.2 | 4.2 | 4.2 |
| 型安全性 | 4.3 | 4.3 | 4.6 | 4.6 |
| ファイル構成 | 3.6 | 4.0 | 4.2 | 4.5 |
| **全体平均** | **3.8** | **4.1** | **4.3** | **4.5** |

---

## テストプラン

各Phaseの修正はリファクタリング（動作変更なし）のため、**修正前と修正後で同一の動作を保証**することがテストの主目的。

### 共通テスト手順（全Phase共通）

| # | 確認項目 | コマンド / 手順 | 合格基準 |
|:-:|---------|---------------|---------|
| C1 | TypeScriptビルド（FE） | `cd frontend && npx tsc --noEmit` | エラー0件 |
| C2 | TypeScriptビルド（BE） | `cd backend && npx tsc --noEmit` | エラー0件 |
| C3 | Viteビルド | `cd frontend && npm run build` | ビルド成功、警告増加なし |
| C4 | バックエンドビルド | `cd backend && npm run build` | ビルド成功 |
| C5 | ESLint | `cd frontend && npx eslint src/` | 新規エラー0件 |

---

### Phase 1 テストプラン

Phase 1はUI共通化とコンポーネント分割が中心。**画面の表示・操作が修正前と同一であること**を確認。

#### Step 1-1（共通UIコンポーネント抽出）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | ページネーション表示 | 社員一覧・企業一覧・案件一覧を開く | 各ページでページ番号ボタン、前へ/次へが表示される |
| 2 | ページ遷移 | 各一覧で2ページ目、最終ページ、1ページ目に移動 | 正しいデータが表示、ボタンのdisabled状態が正しい |
| 3 | 件数表示 | 各一覧のページネーション領域 | 「全X件中 Y-Z件を表示」が正しい |
| 4 | レスポンシブ | ブラウザ幅を768px以下に縮小 | モバイル版ページネーション（前へ/次へのみ）に切り替わる |
| 5 | ローディング表示 | 各一覧ページをリロード | スピナーが表示された後にデータが表示される |
| 6 | エラー表示 | バックエンド停止状態で一覧ページを開く | エラーメッセージが表示される |
| 7 | 空状態表示 | 検索条件で結果0件になる検索を実行 | 空状態メッセージが表示される |
| 8 | 削除確認 | 社員詳細・企業詳細・案件詳細で削除ボタン押下 | 確認ダイアログ表示、キャンセルで戻る、確認で削除実行 |

#### Step 1-2（ProjectDetail分割）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | 案件詳細表示 | 案件詳細ページを開く | 案件情報・アサインメント一覧が正しく表示される |
| 2 | アサイン追加 | 「参画者を追加」→フォーム入力→保存 | 新しいアサインメントが一覧に表示される |
| 3 | アサイン編集 | アサインメントの編集ボタン→値変更→保存 | 変更が反映される |
| 4 | アサイン削除 | アサインメントの削除ボタン→確認 | アサインメントが一覧から消える |
| 5 | 日付バリデーション | 開始日 > 終了日を入力 | エラーメッセージが表示され保存不可 |
| 6 | モーダル開閉 | 追加/編集モーダルのキャンセル・×ボタン | モーダルが閉じ、フォーム状態がリセットされる |

#### Step 1-3（CompanyDetail分割）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | 企業詳細表示 | 企業詳細ページを開く | 基本情報・拠点・部署ツリー・担当窓口・関連案件が全て表示 |
| 2 | 部署ツリー表示 | 階層のある企業を表示 | 事業部→部→課の階層が正しくインデント表示される |
| 3 | 部署追加/編集/削除 | 部署の各操作を実行 | 正しく動作し、ツリーが更新される |
| 4 | 拠点表示 | 拠点が複数ある企業を表示 | 全拠点が表示される |
| 5 | 担当窓口表示 | 担当窓口が複数ある企業を表示 | 全担当窓口が表示される |
| 6 | 関連案件リンク | 関連案件のリンクをクリック | 案件詳細ページに遷移する |

#### Step 1-4（バックエンドリファクタリング）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | 認証・認可 | VIEWER/EDITOR/ADMINでログインし各操作 | 権限に応じたアクセス制御が維持されている |
| 2 | 企業CRUD | 企業の作成・取得・更新・削除 | 拠点・担当窓口含め正しく動作 |
| 3 | 案件CRUD | 案件の作成・取得・更新・削除 | 日付変換・ステータス変更が正しく動作 |
| 4 | 社員検索 | キーワード検索（部分一致/先頭一致）、タグAND検索 | 検索結果が修正前と同一 |
| 5 | CSVインポート | CSVファイルのプレビュー→インポート実行 | プレビュー結果とインポート結果が修正前と同一 |
| 6 | APIレスポンス | 各エンドポイントのレスポンス形式 | JSON構造・フィールドが修正前と同一 |

---

### Phase 2 テストプラン

Phase 2は定数化・ユーティリティ抽出・型安全性向上。**動作に影響なし**だがビルドと既存動作の確認が重要。

#### Step 2-1（定数ファイル作成）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | ページサイズ | 社員一覧（12件/ページ）、企業・案件一覧（20件/ページ） | 修正前と同じ件数で表示 |
| 2 | デバウンス | 社員検索でキーワード入力 | 入力停止後約300msで検索実行（体感変化なし） |
| 3 | 稼働率初期値 | 案件アサイン追加フォーム | 稼働率の初期値が100 |
| 4 | ドロップダウン上限 | 案件フォームの企業選択 | 100件まで表示される |

#### Step 2-2（日付ユーティリティ）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | 日付表示（FE） | 社員詳細の生年月日、入社日 | `YYYY/MM/DD` 形式で正しく表示 |
| 2 | 期間表示（FE） | 案件詳細の契約期間 | 開始日〜終了日が正しく表示 |
| 3 | 日付入力（FE） | 社員登録フォームの日付フィールド | 既存データ編集時にinputに正しい日付がセットされる |
| 4 | 日付変換（BE） | 社員登録API（birthDate, hireDate等） | 文字列→Date変換が正しく、DBに保存される |
| 5 | 日付バリデーション（BE） | 案件の開始日 > 終了日でPOST | バリデーションエラーが返る |

#### Step 2-3（any型排除）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | ビルド確認 | C1〜C4の共通テスト | エラー0件 |
| 2 | ユーザー更新 | ユーザー管理でパスワード・ロール変更 | 正しく更新される |
| 3 | 企業フィルタ | 企業一覧でステータスフィルタ選択 | フィルタが正しく動作 |
| 4 | 案件ステータス | 案件の作成・更新でステータス指定 | 正しいステータスで保存される |

#### Step 2-4（seed.ts分割）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | シード実行 | `cd backend && npx prisma db seed` | エラーなく完了 |
| 2 | データ件数 | シード後にDBの各テーブルのレコード数を確認 | 修正前と同一のレコード数 |
| 3 | リレーション | 社員→スキル、企業→拠点→部署、案件→アサイン | FK参照が正しく紐付いている |
| 4 | 冪等性 | シードを2回連続実行 | エラーなく完了（upsertまたはクリーン&リシード） |

---

### Phase 3 テストプラン

Phase 3は型分割・コンポーネント分割・コメント追加。動作変更なし。

#### Step 3-1（型定義分割）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | ビルド確認 | C1, C3の共通テスト | エラー0件 |
| 2 | import確認 | 全ファイルで `import { ... } from '@/types'` が解決 | re-exportにより既存パスが維持される |
| 3 | 画面表示 | 全ページを一通り開く | 表示崩れ・エラーなし |

#### Step 3-2（EmployeeForm分割）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | 社員登録 | 全フィールド入力→保存 | 正しく登録される |
| 2 | 社員編集 | 既存社員の編集→保存 | 全フィールドが正しくフォームに表示され、更新される |
| 3 | スキル選択 | カテゴリからタグ選択→レベル設定 | 正しく付与される |
| 4 | バリデーション | 必須項目未入力で保存 | エラーメッセージが表示される |
| 5 | 写真アップロード | 写真を選択→プレビュー表示→保存 | 写真が正しくアップロード・表示される |

#### Step 3-3（EmployeeDetail/List改善）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | 社員詳細表示 | 社員詳細ページを開く | 基本情報・スキル（カテゴリ別）・参画履歴が正しく表示 |
| 2 | スキルグループ化 | スキルが複数カテゴリにまたがる社員を表示 | カテゴリ別にグループ化されて表示される |
| 3 | 社員一覧 | マスター/ディテール切り替え | デスクトップで一覧+詳細パネル、モバイルで一覧のみ |

#### Step 3-4（コメント充実）後

| # | 確認項目 | 手順 | 合格基準 |
|:-:|---------|------|---------|
| 1 | ビルド確認 | C1〜C4の共通テスト | エラー0件（コメントのみの変更なので動作影響なし） |

---

## 注意事項

- 各Stepは独立してコミット可能な単位で設計
- Phase 1完了後にビルド + 動作確認を必ず実施
- 共通コンポーネント抽出時は既存のProps名・動作を維持
- re-exportパターンで既存importパスへの影響を最小化
- seed.ts分割時はマイグレーション順序（FK依存関係）を考慮

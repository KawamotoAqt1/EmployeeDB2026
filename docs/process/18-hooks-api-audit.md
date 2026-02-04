# フロントエンドHooksとバックエンドAPI整合性監査レポート

**作成日**: 2026-02-04
**対象**: カスタムフックとバックエンドAPIの整合性

---

## 概要

フロントエンドのカスタムフック（`frontend/src/hooks/*.ts`）とバックエンドAPI（`backend/src/routes/*.ts`）の整合性を調査し、不一致や潜在的な問題を特定した。

---

## 1. 調査対象ファイル一覧

### フロントエンド
| ファイル | 説明 |
|----------|------|
| `frontend/src/hooks/useAuth.tsx` | 認証管理 |
| `frontend/src/hooks/useEmployees.ts` | 社員管理 |
| `frontend/src/hooks/useTags.ts` | タグ・カテゴリ管理 |
| `frontend/src/hooks/useUsers.ts` | ユーザー管理 |
| `frontend/src/hooks/useCompanies.ts` | 企業管理 |
| `frontend/src/hooks/useProjects.ts` | 案件管理 |
| `frontend/src/api/config.ts` | APIクライアント設定 |

### バックエンド
| ファイル | 説明 |
|----------|------|
| `backend/src/routes/auth.ts` | 認証API |
| `backend/src/routes/employees.ts` | 社員API |
| `backend/src/routes/tags.ts` | タグAPI |
| `backend/src/routes/users.ts` | ユーザーAPI |
| `backend/src/routes/companies.ts` | 企業API |
| `backend/src/routes/projects.ts` | 案件API |

---

## 2. フック別詳細分析

### 2.1 useAuth（認証）

#### APIエンドポイント対応

| フック関数 | HTTPメソッド | エンドポイント | バックエンド対応 |
|-----------|-------------|---------------|-----------------|
| `login()` | POST | `/auth/login` | OK |
| `logout()` | POST | `/auth/logout` | OK |
| `refreshUser()` | GET | `/auth/me` | OK |

#### 整合性

- **リクエストパラメータ**: 整合
  - フロント: `{ email, password }`
  - バックエンド: `z.object({ email: z.string().email(), password: z.string().min(1) })`
- **レスポンス**: 整合
  - フロントは `response.data.data.token` と `response.data.data.user` を取得
  - バックエンドは `{ success: true, data: { token, user } }` を返却

#### キャッシュ戦略

- React Queryは使用していない（Context APIで状態管理）

---

### 2.2 useEmployees（社員管理）

#### APIエンドポイント対応

| フック関数 | HTTPメソッド | エンドポイント | バックエンド対応 |
|-----------|-------------|---------------|-----------------|
| `useEmployees()` | GET | `/employees` | OK |
| `useEmployee()` | GET | `/employees/:id` | OK |
| `useCreateEmployee()` | POST | `/employees` | OK |
| `useUpdateEmployee()` | PUT | `/employees/:id` | OK |
| `useDeleteEmployee()` | DELETE | `/employees/:id` | OK |
| `useAddEmployeeSkill()` | POST | `/employees/:id/skills` | OK |
| `useUpdateEmployeeSkill()` | PUT | `/employees/:id/skills/:skillId` | **不一致（注意）** |
| `useDeleteEmployeeSkill()` | DELETE | `/employees/:id/skills/:skillId` | OK |
| `useUploadEmployeeImage()` | POST | `/employees/:id/image` | OK |

#### 問題点

1. **`useUpdateEmployeeSkill()` - エンドポイント不足**
   - フロントエンドは `PUT /employees/:id/skills/:skillId` を呼び出す
   - バックエンドには該当エンドポイントが**存在しない**
   - バックエンドは `POST /employees/:id/skills` でupsert（追加または更新）を行う設計

2. **パラメータ名の変換が必要**
   - フロント `skillLevelMin` → バックエンド `level`
   - フロント `tagIds` → バックエンド `tags`（カンマ区切り文字列に変換）

#### リクエストパラメータ対応表

| フロントエンド | バックエンド | 変換 |
|---------------|-------------|------|
| `keyword` | `q` | 名前変更 |
| `department` | `department` | そのまま |
| `position` | `position` | そのまま |
| `status` | `status` | そのまま |
| `tagIds` (配列) | `tags` (カンマ区切り) | 配列→文字列 |
| `tagOperator` | `tagOperator` | そのまま |
| `matchType` | `matchType` | そのまま |
| `skillLevelMin` | `level` | 名前変更 |
| `page` | `page` | そのまま |
| `limit` | `limit` | そのまま |
| `sortBy` | `sortBy` | そのまま |
| `sortOrder` | `sortOrder` | そのまま |

#### キャッシュ戦略

```typescript
// useEmployee
staleTime: 5 * 60 * 1000,  // 5分間キャッシュ
placeholderData: keepPreviousData,  // 前のデータを保持
```

#### Query Keys

```typescript
employeeKeys = {
  all: ['employees'],
  lists: () => [...employeeKeys.all, 'list'],
  list: (params) => [...employeeKeys.lists(), params],
  details: () => [...employeeKeys.all, 'detail'],
  detail: (id) => [...employeeKeys.details(), id],
}
```

---

### 2.3 useTags（タグ管理）

#### APIエンドポイント対応

| フック関数 | HTTPメソッド | エンドポイント | バックエンド対応 |
|-----------|-------------|---------------|-----------------|
| `useTagList()` | GET | `/tags` | OK |
| `useAllTags()` | GET | `/tags?limit=1000` | **潜在的問題** |
| `useTagCategories()` | GET | `/tags/categories` | OK |
| `useCreateTag()` | POST | `/tags` | OK |
| `useUpdateTag()` | PUT | `/tags/:id` | OK |
| `useDeleteTag()` | DELETE | `/tags/:id` | OK |
| `useCreateTagCategory()` | POST | `/tags/categories` | OK |
| `useUpdateTagCategory()` | PUT | `/tags/categories/:id` | OK |
| `useDeleteTagCategory()` | DELETE | `/tags/categories/:id` | OK |
| `useReorderTags()` | PUT | `/tags/reorder` | OK |
| `useReorderCategories()` | PUT | `/tags/categories/reorder` | OK |

#### 問題点

1. **`useAllTags()` の limit=1000**
   - フロントは `limit: 1000` をリクエスト
   - バックエンドのタグ取得には `max(100)` 制限がない（`Number(limit)` で処理）
   - 現在は動作するが、将来的に制限が追加された場合に問題になる可能性

2. **型定義の不一致**
   - フロント `CreateTagCategoryRequest`: `{ name, description?, color? }`
   - バックエンド: `{ code, name, parentId?, sortOrder? }`
   - `code` が必須だがフロント型定義にない
   - `description`, `color` はバックエンドスキーマにない

#### キャッシュ戦略

- 標準的なReact Query設定（staleTimeなど明示的な設定なし）

---

### 2.4 useUsers（ユーザー管理）

#### APIエンドポイント対応

| フック関数 | HTTPメソッド | エンドポイント | バックエンド対応 |
|-----------|-------------|---------------|-----------------|
| `useUsers()` | GET | `/users` | OK |
| `useUser()` | GET | `/users/:id` | OK |
| `useCreateUser()` | POST | `/users` | OK |
| `useUpdateUser()` | PUT | `/users/:id` | OK |
| `useDeleteUser()` | DELETE | `/users/:id` | OK |

#### 問題点

1. **API_ENDPOINTSを使用していない**
   - 他のフックは `API_ENDPOINTS.xxx` を使用
   - `useUsers` は直接 `/users` のようにハードコード

2. **型定義の不一致**
   - フロント `CreateUserRequest`: `{ username, email, password, role, employeeId? }`
   - バックエンド: `{ email, password, role }`
   - `username`, `employeeId` はバックエンドスキーマにない

#### 整合性

- レスポンス形式は整合（`{ success: true, data: {...}, pagination: {...} }`）

---

### 2.5 useCompanies（企業管理）

#### APIエンドポイント対応

| フック関数 | HTTPメソッド | エンドポイント | バックエンド対応 |
|-----------|-------------|---------------|-----------------|
| `useCompanies()` | GET | `/companies` | OK |
| `useCompany()` | GET | `/companies/:id` | OK |
| `useCreateCompany()` | POST | `/companies` | OK |
| `useUpdateCompany()` | PUT | `/companies/:id` | OK |
| `useDeleteCompany()` | DELETE | `/companies/:id` | OK |

#### リクエストパラメータ対応表

| フロントエンド | バックエンド | 変換 |
|---------------|-------------|------|
| `keyword` | `q` | 名前変更 |
| `industry` | `industry` | そのまま |
| `status` | `status` | そのまま |
| `page` | `page` | そのまま |
| `limit` | `limit` | そのまま |
| `sortBy` | `sortBy` | そのまま |
| `sortOrder` | `sortOrder` | そのまま |

#### 問題点

1. **limit制限**
   - バックエンド: `limit: z.coerce.number().int().positive().max(100)`
   - 前回の修正（dropdown-data-reference-fix）で `limit: 100` に制限済み

#### 整合性

- 完全に整合

---

### 2.6 useProjects（案件管理）

#### APIエンドポイント対応

| フック関数 | HTTPメソッド | エンドポイント | バックエンド対応 |
|-----------|-------------|---------------|-----------------|
| `useProjects()` | GET | `/projects` | **パラメータ不一致** |
| `useProject()` | GET | `/projects/:id` | OK |
| `useCreateProject()` | POST | `/projects` | OK |
| `useUpdateProject()` | PUT | `/projects/:id` | OK |
| `useDeleteProject()` | DELETE | `/projects/:id` | OK |
| `useCreateProjectAssignment()` | POST | `/projects/:id/assignments` | OK |
| `useUpdateProjectAssignment()` | PUT | `/projects/:id/assignments/:assignmentId` | OK |
| `useDeleteProjectAssignment()` | DELETE | `/projects/:id/assignments/:assignmentId` | OK |

#### 問題点

1. **検索パラメータ名の不一致**
   - フロント: `keyword` → バックエンドは `q` を使用**していない**
   - バックエンド: `keyword` で検索
   - **実際には整合している**（フロントが `q` に変換しているが、バックエンドは `keyword` を期待）

   ```typescript
   // フロントエンド (useProjects.ts)
   const apiParams = {
     q: params.keyword,  // ← keywordをqとして送信
     ...
   };

   // バックエンド (projects.ts)
   const projectListQuerySchema = z.object({
     keyword: z.string().optional(),  // ← keywordを期待
     ...
   });
   ```

   **これは不一致！** フロントは `q` として送信するが、バックエンドは `keyword` を期待している。

#### 整合性

- **重大な不一致**: 検索キーワードが機能していない可能性

---

## 3. 発見された問題一覧

### 3.1 重大な問題

| # | カテゴリ | 問題 | 影響 | ファイル |
|---|---------|------|------|---------|
| 1 | **API不一致** | `useUpdateEmployeeSkill()` に対応するバックエンドエンドポイントがない | スキルレベル更新が失敗する可能性 | `useEmployees.ts`, `employees.ts` |
| 2 | **パラメータ不一致** | `useProjects()` が `q` を送信するが、バックエンドは `keyword` を期待 | 案件検索が機能しない | `useProjects.ts`, `projects.ts` |

### 3.2 中程度の問題

| # | カテゴリ | 問題 | 影響 | ファイル |
|---|---------|------|------|---------|
| 3 | **型定義不一致** | `CreateTagCategoryRequest` にバックエンド必須の `code` がない | ランタイムエラー | `types/index.ts` |
| 4 | **型定義不一致** | `CreateUserRequest` に存在しない `username`, `employeeId` がある | 型安全性の低下 | `types/index.ts` |
| 5 | **一貫性** | `useUsers` が `API_ENDPOINTS` を使用していない | 保守性の低下 | `useUsers.ts` |

### 3.3 軽微な問題

| # | カテゴリ | 問題 | 影響 | ファイル |
|---|---------|------|------|---------|
| 6 | **潜在的問題** | `useAllTags()` の `limit: 1000` がバックエンドに制限追加時に問題になる | 将来的な互換性 | `useTags.ts` |

---

## 4. エラーハンドリング分析

### 4.1 共通パターン

全てのフックでReact Queryを使用し、エラーは自動的にキャッチされる。

#### APIクライアントインターセプター

```typescript
// frontend/src/api/config.ts
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    // 401エラー: ログインページへリダイレクト
    if (error.response?.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    // エラーを整形して返却
    const apiError: ApiError = error.response?.data || {
      code: 'UNKNOWN_ERROR',
      message: error.message || '不明なエラーが発生しました',
    };
    return Promise.reject(apiError);
  }
);
```

### 4.2 エラーハンドリングの評価

| 観点 | 評価 | コメント |
|------|------|----------|
| 認証エラー (401) | 良好 | 自動リダイレクト |
| 権限エラー (403) | 中程度 | 個別コンポーネントで処理が必要 |
| バリデーションエラー (400) | 中程度 | エラーメッセージは返却されるが、フィールド単位の表示は未実装 |
| サーバーエラー (500) | 中程度 | 汎用エラーメッセージで対応 |

---

## 5. キャッシュ戦略まとめ

### 5.1 Query Keys構造

| フック | Query Keys |
|--------|-----------|
| `useEmployees` | `['employees', 'list', params]`, `['employees', 'detail', id]` |
| `useTags` | `['tags', 'list', params]`, `['tagCategories']` |
| `useUsers` | `['users', 'list', params]`, `['users', 'detail', id]` |
| `useCompanies` | `['companies', 'list', params]`, `['companies', 'detail', id]` |
| `useProjects` | `['projects', 'list', params]`, `['projects', 'detail', id]` |

### 5.2 キャッシュ無効化

全てのMutationで適切に `queryClient.invalidateQueries()` を呼び出している。

```typescript
// 例: useCreateEmployee
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: employeeKeys.lists() });
},
```

### 5.3 staleTime設定

| フック | staleTime | 備考 |
|--------|-----------|------|
| `useEmployee` | 5分 | 詳細画面のフリッカー防止 |
| その他 | デフォルト (0) | 即座に再検証 |

---

## 6. 推奨対応

### 6.1 即時対応（重大）

1. **スキル更新エンドポイントの追加または修正**
   - オプションA: バックエンドに `PUT /employees/:id/skills/:skillId` を追加
   - オプションB: フロントエンドを `POST /employees/:id/skills`（upsert）に変更

2. **案件検索パラメータの修正**
   ```typescript
   // useProjects.ts を修正
   const apiParams = {
     keyword: params.keyword,  // q ではなく keyword
     ...
   };
   ```
   または
   ```typescript
   // projects.ts を修正
   const projectListQuerySchema = z.object({
     q: z.string().optional(),  // keyword ではなく q
     ...
   });
   ```

### 6.2 中期対応（中程度）

3. **型定義の修正**
   - `CreateTagCategoryRequest` に `code` を追加
   - `CreateUserRequest` から `username`, `employeeId` を削除

4. **useUsersのAPI_ENDPOINTS使用**
   ```typescript
   // 現在
   await apiClient.get('/users', { params });
   // 推奨
   await apiClient.get(API_ENDPOINTS.users.list, { params });
   ```

### 6.3 長期対応（軽微）

5. **タグ取得のlimit統一**
   - バックエンドに統一的なページネーション制限を設定
   - フロントエンドの `limit: 1000` を見直し

---

## 7. 付録: エンドポイント一覧

### 認証 (`/api/auth`)
| メソッド | パス | 認証 | 権限 |
|---------|------|------|------|
| POST | `/login` | 不要 | - |
| POST | `/logout` | 必要 | - |
| GET | `/me` | 必要 | - |

### 社員 (`/api/employees`)
| メソッド | パス | 認証 | 権限 |
|---------|------|------|------|
| GET | `/` | 必要 | - |
| GET | `/:id` | 必要 | - |
| POST | `/` | 必要 | EDITOR+ |
| PUT | `/:id` | 必要 | EDITOR+ |
| DELETE | `/:id` | 必要 | EDITOR+ |
| POST | `/:id/skills` | 必要 | EDITOR+ |
| DELETE | `/:id/skills/:skillId` | 必要 | EDITOR+ |
| POST | `/:id/image` | 必要 | ADMIN |
| DELETE | `/:id/image` | 必要 | ADMIN |
| GET | `/:id/assignments` | 必要 | - |

### タグ (`/api/tags`)
| メソッド | パス | 認証 | 権限 |
|---------|------|------|------|
| GET | `/` | 必要 | - |
| POST | `/` | 必要 | EDITOR+ |
| PUT | `/:id` | 必要 | EDITOR+ |
| DELETE | `/:id` | 必要 | EDITOR+ |
| PUT | `/reorder` | 必要 | EDITOR+ |
| GET | `/categories` | 必要 | - |
| POST | `/categories` | 必要 | EDITOR+ |
| PUT | `/categories/:id` | 必要 | EDITOR+ |
| DELETE | `/categories/:id` | 必要 | EDITOR+ |
| PUT | `/categories/reorder` | 必要 | EDITOR+ |

### ユーザー (`/api/users`)
| メソッド | パス | 認証 | 権限 |
|---------|------|------|------|
| GET | `/` | 必要 | ADMIN |
| GET | `/:id` | 必要 | ADMIN |
| POST | `/` | 必要 | ADMIN |
| PUT | `/:id` | 必要 | ADMIN |
| DELETE | `/:id` | 必要 | ADMIN |

### 企業 (`/api/companies`)
| メソッド | パス | 認証 | 権限 |
|---------|------|------|------|
| GET | `/` | 必要 | - |
| GET | `/:id` | 必要 | - |
| POST | `/` | 必要 | EDITOR+ |
| PUT | `/:id` | 必要 | EDITOR+ |
| DELETE | `/:id` | 必要 | EDITOR+ |
| GET | `/:companyId/offices` | 必要 | - |
| POST | `/:companyId/offices` | 必要 | EDITOR+ |
| PUT | `/:companyId/offices/:id` | 必要 | EDITOR+ |
| DELETE | `/:companyId/offices/:id` | 必要 | EDITOR+ |
| GET | `/:companyId/departments` | 必要 | - |
| GET | `/:companyId/departments/tree` | 必要 | - |
| POST | `/:companyId/departments` | 必要 | EDITOR+ |
| PUT | `/:companyId/departments/:id` | 必要 | EDITOR+ |
| DELETE | `/:companyId/departments/:id` | 必要 | EDITOR+ |
| GET | `/:companyId/contacts` | 必要 | - |
| POST | `/:companyId/contacts` | 必要 | EDITOR+ |
| PUT | `/:companyId/contacts/:id` | 必要 | EDITOR+ |
| DELETE | `/:companyId/contacts/:id` | 必要 | EDITOR+ |

### 案件 (`/api/projects`)
| メソッド | パス | 認証 | 権限 |
|---------|------|------|------|
| GET | `/` | 必要 | - |
| GET | `/:id` | 必要 | - |
| POST | `/` | 必要 | EDITOR+ |
| PUT | `/:id` | 必要 | EDITOR+ |
| DELETE | `/:id` | 必要 | EDITOR+ |
| GET | `/:projectId/assignments` | 必要 | - |
| POST | `/:projectId/assignments` | 必要 | EDITOR+ |
| PUT | `/:projectId/assignments/:id` | 必要 | EDITOR+ |
| DELETE | `/:projectId/assignments/:id` | 必要 | EDITOR+ |

---

**監査完了**

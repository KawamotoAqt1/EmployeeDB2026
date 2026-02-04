# API Endpoints Audit Report

**作成日**: 2026-02-04
**対象ディレクトリ**: `backend/src/routes/`

## 概要

本ドキュメントはEmployeeDB APIの全エンドポイント仕様を網羅的に記載したものです。

### ルート登録 (backend/src/index.ts)

| ルーター | ベースパス |
|---------|-----------|
| authRouter | `/api/auth` |
| usersRouter | `/api/users` |
| employeesRouter | `/api/employees` |
| tagsRouter | `/api/tags` |
| companiesRouter | `/api/companies` |
| importRouter | `/api/import` |
| projectsRouter | `/api/projects` |

---

## 共通仕様

### 認証方式

- **JWT Bearer Token**: `Authorization: Bearer <token>` ヘッダーで認証
- 認証レベル:
  - `requireAuth`: ログイン必須（全ロール可）
  - `requireEditor`: ADMIN または EDITOR 権限必須
  - `requireAdmin`: ADMIN 権限必須

### 共通レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": { ... }
}
```

#### ページネーション付き成功時
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

#### エラー時
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 共通エラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| UNAUTHORIZED | 401 | 認証が必要 |
| TOKEN_EXPIRED | 401 | トークン有効期限切れ |
| INVALID_TOKEN | 401 | 無効なトークン |
| USER_NOT_FOUND | 401 | ユーザーが見つからない |
| FORBIDDEN | 403 | 権限不足 |
| NOT_FOUND | 404 | リソースが見つからない |
| VALIDATION_ERROR | 400 | バリデーションエラー |
| DUPLICATE_ENTRY | 409 | 重複エラー |
| FOREIGN_KEY_ERROR | 400 | 外部キー制約エラー |
| DATABASE_ERROR | 500 | データベースエラー |
| INTERNAL_SERVER_ERROR | 500 | 内部サーバーエラー |

---

## ヘルスチェック・基本エンドポイント (index.ts)

### GET /health
- **認証**: なし
- **リクエスト**: なし
- **レスポンス**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-02-04T00:00:00.000Z",
    "database": "connected",
    "environment": "development"
  }
  ```
- **エラー**:
  - 503: `status: "unhealthy"`, `database: "disconnected"`

### GET /api
- **認証**: なし
- **リクエスト**: なし
- **レスポンス**: API情報とエンドポイント一覧

### GET /api/tag-categories (レガシー)
- **認証**: なし
- **リクエスト**: なし
- **レスポンス**: 親カテゴリとタグの階層構造

### GET /api/stats
- **認証**: なし
- **リクエスト**: なし
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "totalEmployees": 100,
      "activeEmployees": 80,
      "inactiveEmployees": 20,
      "departmentDistribution": [
        { "department": "開発部", "count": 30 }
      ],
      "topSkillsCount": 50
    }
  }
  ```

---

## auth.ts - 認証

### POST /api/auth/login
- **認証**: なし
- **リクエスト**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "token": "jwt_token_here",
      "user": {
        "id": "uuid",
        "email": "user@example.com",
        "role": "ADMIN"
      }
    }
  }
  ```
- **エラー**:
  - INVALID_CREDENTIALS (401): メールアドレスまたはパスワードが正しくない

### POST /api/auth/logout
- **認証**: requireAuth
- **リクエスト**: なし
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "message": "ログアウトしました"
    }
  }
  ```

### GET /api/auth/me
- **認証**: requireAuth
- **リクエスト**: なし
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "ADMIN",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  }
  ```
- **エラー**:
  - USER_NOT_FOUND (404): ユーザーが見つからない

---

## users.ts - ユーザー管理

### GET /api/users
- **認証**: requireAuth + requireAdmin
- **リクエスト** (クエリパラメータ):
  | パラメータ | 型 | デフォルト | 説明 |
  |-----------|-----|-----------|------|
  | page | number | 1 | ページ番号 |
  | limit | number | 20 | 取得件数 (max: 100) |
  | sortBy | string | "createdAt" | ソートフィールド |
  | sortOrder | "asc" \| "desc" | "desc" | ソート順 |
- **レスポンス**: ユーザー一覧 + ページネーション

### GET /api/users/:id
- **認証**: requireAuth + requireAdmin
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "EDITOR",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): ユーザーが見つからない

### POST /api/users
- **認証**: requireAuth + requireAdmin
- **リクエスト**:
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "role": "EDITOR"
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | email | string | Yes | メールアドレス (email形式) |
  | password | string | Yes | パスワード (6文字以上) |
  | role | "ADMIN" \| "EDITOR" \| "VIEWER" | No | ロール (デフォルト: VIEWER) |
- **レスポンス**: 作成されたユーザー情報 (201)
- **エラー**:
  - DUPLICATE_EMAIL (400): メールアドレスが既に使用されている

### PUT /api/users/:id
- **認証**: requireAuth + requireAdmin
- **リクエスト**:
  ```json
  {
    "email": "updated@example.com",
    "password": "newpassword",
    "role": "ADMIN"
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | email | string | No | メールアドレス |
  | password | string | No | パスワード (6文字以上) |
  | role | "ADMIN" \| "EDITOR" \| "VIEWER" | No | ロール |
- **レスポンス**: 更新されたユーザー情報
- **エラー**:
  - NOT_FOUND (404): ユーザーが見つからない
  - DUPLICATE_EMAIL (400): メールアドレスが既に使用されている

### DELETE /api/users/:id
- **認証**: requireAuth + requireAdmin
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "message": "ユーザーを削除しました"
    }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): ユーザーが見つからない
  - BAD_REQUEST (400): 自分自身のアカウントは削除できない

---

## employees.ts - 社員管理

### GET /api/employees
- **認証**: requireAuth
- **リクエスト** (クエリパラメータ):
  | パラメータ | 型 | デフォルト | 説明 |
  |-----------|-----|-----------|------|
  | q | string | - | 検索キーワード (全フィールド対象、スペース区切りでAND検索) |
  | department | string | - | 部署フィルタ |
  | position | string | - | 役職フィルタ |
  | location | string | - | 勤務地フィルタ |
  | status | "ACTIVE" \| "INACTIVE" \| "RESIGNED" \| "PENDING" | - | ステータスフィルタ |
  | tags | string | - | タグID (カンマ区切り) |
  | tagOperator | "AND" \| "OR" | "AND" | タグ検索演算子 |
  | matchType | "partial" \| "prefix" | "partial" | 検索マッチタイプ |
  | level | string | - | 最低スキルレベル |
  | page | number | 1 | ページ番号 |
  | limit | number | 20 | 取得件数 (max: 100) |
  | sortBy | string | "employeeNumber" | ソートフィールド |
  | sortOrder | "asc" \| "desc" | "asc" | ソート順 |
- **レスポンス**: 社員一覧 (スキル情報含む) + ページネーション

### GET /api/employees/:id
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**: 社員詳細 (スキル・カテゴリ情報含む)
- **エラー**:
  - NOT_FOUND (404): 社員が見つからない

### POST /api/employees
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "employeeNumber": "E001",
    "fullName": "山田太郎",
    "fullNameKana": "ヤマダタロウ",
    "email": "yamada@example.com",
    "birthDate": "1990-01-01",
    "gender": "MALE",
    "contractType": "FULL_TIME",
    "department": "開発部",
    "position": "主任",
    "location": "東京",
    "country": "日本",
    "residence": "東京都渋谷区",
    "station": "渋谷駅",
    "hireDate": "2020-04-01",
    "contractEndDate": null,
    "status": "ACTIVE",
    "remark": "備考",
    "photoUrl": null
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | employeeNumber | string | Yes | 社員番号 (max: 20) |
  | fullName | string | Yes | 氏名 (max: 100) |
  | employeeUniqueNumber | string | No | 社員固有番号 (max: 50) |
  | fullNameKana | string | No | 氏名カナ (max: 100) |
  | email | string | No | メール (email形式) |
  | birthDate | string | No | 生年月日 (ISO 8601) |
  | gender | "MALE" \| "FEMALE" \| "OTHER" | No | 性別 |
  | contractType | "FULL_TIME" \| "CONTRACT" \| "PART_TIME" \| "TEMPORARY" \| "INTERN" \| "OUTSOURCE" | No | 契約形態 |
  | department | string | No | 部署 (max: 100) |
  | position | string | No | 役職 (max: 100) |
  | location | string | No | 勤務地 (max: 100) |
  | country | string | No | 国 (max: 50) |
  | residence | string | No | 住所 (max: 100) |
  | station | string | No | 最寄り駅 (max: 100) |
  | hireDate | string | No | 入社日 (ISO 8601) |
  | contractEndDate | string | No | 契約終了日 (ISO 8601) |
  | status | "ACTIVE" \| "INACTIVE" \| "RESIGNED" \| "PENDING" | No | ステータス (デフォルト: ACTIVE) |
  | remark | string | No | 備考 |
  | photoUrl | string | No | 写真URL (max: 500) |
- **レスポンス**: 作成された社員情報 (201)

### PUT /api/employees/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新された社員情報
- **エラー**:
  - NOT_FOUND (404): 社員が見つからない

### DELETE /api/employees/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "社員を削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 社員が見つからない

### POST /api/employees/:id/skills
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "tagId": "uuid",
    "level": "INTERMEDIATE"
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | tagId | string | Yes | タグID (UUID) |
  | level | "BEGINNER" \| "INTERMEDIATE" \| "ADVANCED" \| "EXPERT" | No | スキルレベル (デフォルト: BEGINNER) |
- **レスポンス**: 追加/更新されたスキル情報 (201)
- **エラー**:
  - BAD_REQUEST (400): 社員IDが必要
  - NOT_FOUND (404): 社員/タグが見つからない

### DELETE /api/employees/:id/skills/:skillId
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `id`, `skillId` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "スキルを削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 社員/スキルが見つからない

### POST /api/employees/:id/image
- **認証**: requireAuth + requireAdmin
- **リクエスト**: `multipart/form-data`
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | image | file | Yes | 画像ファイル (JPEG, PNG, GIF, WebP, max: 5MB) |
- **レスポンス**: 更新された社員情報
- **エラー**:
  - BAD_REQUEST (400): 画像ファイルが必要
  - NOT_FOUND (404): 社員が見つからない

### DELETE /api/employees/:id/image
- **認証**: requireAuth + requireAdmin
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**: 更新された社員情報 (photoUrl: null)
- **エラー**:
  - NOT_FOUND (404): 社員が見つからない

### GET /api/employees/:id/assignments
- **認証**: requireAuth
- **リクエスト** (クエリパラメータ):
  | パラメータ | 型 | デフォルト | 説明 |
  |-----------|-----|-----------|------|
  | status | string | - | ステータスフィルタ |
  | page | number | 1 | ページ番号 |
  | limit | number | 20 | 取得件数 |
- **レスポンス**: 社員の参画履歴一覧 + ページネーション
- **エラー**:
  - NOT_FOUND (404): 社員が見つからない

---

## tags.ts - タグ管理

### GET /api/tags/categories
- **認証**: requireAuth
- **リクエスト**: なし
- **レスポンス**: カテゴリ一覧 (タグ・子カテゴリ含む、階層構造)

### POST /api/tags/categories
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "code": "TECH",
    "name": "技術スキル",
    "parentId": null,
    "sortOrder": 0
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | code | string | Yes | コード (max: 50) |
  | name | string | Yes | 名前 (max: 100) |
  | parentId | string | No | 親カテゴリID (UUID) |
  | sortOrder | number | No | 並び順 (デフォルト: 0) |
- **レスポンス**: 作成されたカテゴリ情報 (201)
- **エラー**:
  - NOT_FOUND (404): 親カテゴリが見つからない

### PUT /api/tags/categories/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新されたカテゴリ情報
- **エラー**:
  - NOT_FOUND (404): カテゴリ/親カテゴリが見つからない
  - INVALID_PARENT (400): 自分自身を親カテゴリに設定できない

### DELETE /api/tags/categories/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "カテゴリを削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): カテゴリが見つからない
  - HAS_CHILDREN (400): 子カテゴリが存在するため削除不可
  - HAS_TAGS (400): タグが存在するため削除不可

### PUT /api/tags/categories/reorder
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "categoryIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "カテゴリの並び順を更新しました" }
  }
  ```

### GET /api/tags
- **認証**: requireAuth
- **リクエスト** (クエリパラメータ):
  | パラメータ | 型 | デフォルト | 説明 |
  |-----------|-----|-----------|------|
  | categoryId | string | - | カテゴリIDでフィルタ (UUID) |
  | limit | number | 1000 | 取得件数 |
- **レスポンス**: タグ一覧 (カテゴリ情報含む)

### POST /api/tags
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "categoryId": "uuid",
    "name": "JavaScript",
    "sortOrder": 0
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | categoryId | string | Yes | カテゴリID (UUID) |
  | name | string | Yes | 名前 (max: 100) |
  | sortOrder | number | No | 並び順 (デフォルト: 0) |
- **レスポンス**: 作成されたタグ情報 (201)
- **エラー**:
  - NOT_FOUND (404): カテゴリが見つからない

### PUT /api/tags/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新されたタグ情報
- **エラー**:
  - NOT_FOUND (404): タグ/カテゴリが見つからない

### DELETE /api/tags/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "タグを削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): タグが見つからない
  - TAG_IN_USE (400): 社員に使用されているため削除不可

### PUT /api/tags/reorder
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "tagIds": ["uuid1", "uuid2", "uuid3"]
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "タグの並び順を更新しました" }
  }
  ```

---

## companies.ts - 企業管理

### GET /api/companies
- **認証**: requireAuth
- **リクエスト** (クエリパラメータ):
  | パラメータ | 型 | デフォルト | 説明 |
  |-----------|-----|-----------|------|
  | q | string | - | 検索キーワード (名前、カナ、コード、住所、業種) |
  | status | "ACTIVE" \| "INACTIVE" \| "TERMINATED" | - | ステータスフィルタ |
  | industry | string | - | 業種フィルタ |
  | page | number | 1 | ページ番号 |
  | limit | number | 20 | 取得件数 (max: 100) |
  | sortBy | string | "name" | ソートフィールド |
  | sortOrder | "asc" \| "desc" | "asc" | ソート順 |
- **レスポンス**: 企業一覧 (件数情報含む) + ページネーション

### GET /api/companies/:id
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**: 企業詳細 (拠点、部署ツリー、担当窓口、最新案件10件含む)
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### POST /api/companies
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "code": "COMP001",
    "name": "株式会社サンプル",
    "nameKana": "カブシキガイシャサンプル",
    "postalCode": "100-0001",
    "address": "東京都千代田区",
    "phone": "03-1234-5678",
    "website": "https://example.com",
    "industry": "IT",
    "status": "ACTIVE",
    "remark": "備考",
    "offices": [
      {
        "name": "本社",
        "postalCode": "100-0001",
        "address": "東京都千代田区",
        "phone": "03-1234-5678",
        "isHeadquarters": true
      }
    ],
    "contacts": [
      {
        "name": "担当者名",
        "nameKana": "タントウシャメイ",
        "title": "部長",
        "email": "contact@example.com",
        "phone": "03-1234-5678",
        "mobile": "090-1234-5678",
        "isPrimary": true,
        "remark": "備考"
      }
    ]
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | code | string | Yes | 企業コード (max: 50) |
  | name | string | Yes | 企業名 (max: 200) |
  | nameKana | string | No | 企業名カナ (max: 200) |
  | postalCode | string | No | 郵便番号 (max: 10) |
  | address | string | No | 住所 |
  | phone | string | No | 電話番号 (max: 20) |
  | website | string | No | Webサイト (max: 500) |
  | industry | string | No | 業種 (max: 100) |
  | status | "ACTIVE" \| "INACTIVE" \| "TERMINATED" | No | ステータス (デフォルト: ACTIVE) |
  | remark | string | No | 備考 |
  | offices | array | No | 拠点一覧 |
  | contacts | array | No | 担当窓口一覧 |
- **レスポンス**: 作成された企業情報 (201)
- **エラー**:
  - DUPLICATE_CODE (400): 企業コードが既に使用されている

### PUT /api/companies/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
  - `offices` を渡すと既存の拠点は削除され、新しい拠点に置き換え
  - `contacts` を渡すと既存の担当窓口は削除され、新しい担当窓口に置き換え
- **レスポンス**: 更新された企業情報
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない
  - BAD_REQUEST (400): 企業IDが必要
  - DUPLICATE_CODE (400): 企業コードが既に使用されている

### DELETE /api/companies/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "企業を削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### GET /api/companies/:companyId/offices
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `companyId` (UUID)
- **レスポンス**: 拠点一覧 (部署数含む)
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### POST /api/companies/:companyId/offices
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "name": "支店名",
    "postalCode": "100-0001",
    "address": "住所",
    "phone": "03-1234-5678",
    "isHeadquarters": false,
    "sortOrder": 1
  }
  ```
- **レスポンス**: 作成された拠点情報 (201)
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### PUT /api/companies/:companyId/offices/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新された拠点情報
- **エラー**:
  - NOT_FOUND (404): 企業/拠点が見つからない

### DELETE /api/companies/:companyId/offices/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `companyId`, `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "拠点を削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 企業/拠点が見つからない

### GET /api/companies/:companyId/departments
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `companyId` (UUID)
- **レスポンス**: 部署一覧 (フラット構造、拠点・親部署情報含む)
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### GET /api/companies/:companyId/departments/tree
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `companyId` (UUID)
- **レスポンス**: 部署ツリー (階層構造、最大4階層)
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### POST /api/companies/:companyId/departments
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "officeId": "uuid",
    "parentId": null,
    "type": "DEPARTMENT",
    "name": "開発部",
    "sortOrder": 0
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | officeId | string | No | 拠点ID (UUID) |
  | parentId | string | No | 親部署ID (UUID) |
  | type | "DIVISION" \| "DEPARTMENT" \| "SECTION" \| "UNIT" \| "OTHER" | Yes | 部署タイプ |
  | name | string | Yes | 名前 (max: 200) |
  | sortOrder | number | No | 並び順 (デフォルト: 0) |
- **レスポンス**: 作成された部署情報 (201)
- **エラー**:
  - NOT_FOUND (404): 企業/親部署/拠点が見つからない

### PUT /api/companies/:companyId/departments/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新された部署情報
- **エラー**:
  - NOT_FOUND (404): 企業/部署/親部署/拠点が見つからない
  - INVALID_PARENT (400): 自分自身を親部署に設定できない

### DELETE /api/companies/:companyId/departments/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `companyId`, `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "部署を削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 企業/部署が見つからない
  - HAS_CHILDREN (400): 子部署が存在するため削除不可

### GET /api/companies/:companyId/contacts
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `companyId` (UUID)
- **レスポンス**: 担当窓口一覧 (部署情報含む)
- **エラー**:
  - NOT_FOUND (404): 企業が見つからない

### POST /api/companies/:companyId/contacts
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "departmentId": "uuid",
    "name": "担当者名",
    "nameKana": "タントウシャメイ",
    "title": "部長",
    "email": "contact@example.com",
    "phone": "03-1234-5678",
    "mobile": "090-1234-5678",
    "isPrimary": true,
    "remark": "備考"
  }
  ```
- **レスポンス**: 作成された担当窓口情報 (201)
- **エラー**:
  - NOT_FOUND (404): 企業/部署が見つからない

### PUT /api/companies/:companyId/contacts/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新された担当窓口情報
- **エラー**:
  - NOT_FOUND (404): 企業/担当窓口/部署が見つからない

### DELETE /api/companies/:companyId/contacts/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `companyId`, `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "担当窓口を削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 企業/担当窓口が見つからない

---

## projects.ts - 案件管理

### GET /api/projects
- **認証**: requireAuth
- **リクエスト** (クエリパラメータ):
  | パラメータ | 型 | デフォルト | 説明 |
  |-----------|-----|-----------|------|
  | keyword | string | - | 検索キーワード (名前、コード、説明、勤務地) |
  | companyId | string | - | 企業IDフィルタ (UUID) |
  | status | "PROPOSAL" \| "IN_PROGRESS" \| "COMPLETED" \| "CANCELLED" \| "ON_HOLD" | - | ステータスフィルタ |
  | contractType | "DISPATCH" \| "SES" \| "CONTRACT" | - | 契約形態フィルタ |
  | page | number | 1 | ページ番号 |
  | limit | number | 20 | 取得件数 (max: 100) |
  | sortBy | string | "createdAt" | ソートフィールド |
  | sortOrder | "asc" \| "desc" | "desc" | ソート順 |
- **レスポンス**: 案件一覧 (企業・部署情報、参画サマリ含む) + ページネーション

### GET /api/projects/:id
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**: 案件詳細 (企業、部署、参画社員一覧含む)
- **エラー**:
  - NOT_FOUND (404): 案件が見つからない

### POST /api/projects
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "code": "PRJ001",
    "name": "Webシステム開発",
    "description": "新規Webシステムの開発案件",
    "companyId": "uuid",
    "departmentId": "uuid",
    "contractType": "SES",
    "contractStartDate": "2026-04-01",
    "contractEndDate": "2026-09-30",
    "deliveryDate": "2026-09-15",
    "budget": 10000000,
    "unitPrice": 800000,
    "status": "PROPOSAL",
    "location": "東京",
    "remark": "備考"
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | code | string | Yes | 案件コード (max: 50) |
  | name | string | Yes | 案件名 (max: 200) |
  | description | string | No | 説明 |
  | companyId | string | Yes | 企業ID (UUID) |
  | departmentId | string | No | 部署ID (UUID) |
  | contractType | "DISPATCH" \| "SES" \| "CONTRACT" | Yes | 契約形態 |
  | contractStartDate | string | No | 契約開始日 (ISO 8601) |
  | contractEndDate | string | No | 契約終了日 (ISO 8601) |
  | deliveryDate | string | No | 納品日 (ISO 8601) |
  | budget | number | No | 予算 |
  | unitPrice | number | No | 単価 |
  | status | "PROPOSAL" \| "IN_PROGRESS" \| "COMPLETED" \| "CANCELLED" \| "ON_HOLD" | No | ステータス (デフォルト: PROPOSAL) |
  | location | string | No | 勤務地 (max: 200) |
  | remark | string | No | 備考 |
- **レスポンス**: 作成された案件情報 (201)
- **エラー**:
  - BAD_REQUEST (400): 契約終了日は契約開始日以降である必要がある
  - BAD_REQUEST (400): 指定された企業/部署が見つからない

### PUT /api/projects/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: POST と同形式 (全フィールド任意)
- **レスポンス**: 更新された案件情報
- **エラー**:
  - NOT_FOUND (404): 案件が見つからない
  - BAD_REQUEST (400): 指定された企業が見つからない

### DELETE /api/projects/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "案件を削除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 案件が見つからない

### GET /api/projects/:projectId/assignments
- **認証**: requireAuth
- **リクエスト**: パスパラメータ `projectId` (UUID)
- **レスポンス**: 案件の参画社員一覧 (社員詳細情報含む)
- **エラー**:
  - NOT_FOUND (404): 案件が見つからない

### POST /api/projects/:projectId/assignments
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "employeeId": "uuid",
    "role": "SE",
    "assignmentStartDate": "2026-04-01",
    "assignmentEndDate": "2026-09-30",
    "workloadPercentage": 100,
    "unitPrice": 800000,
    "billingType": "MONTHLY",
    "status": "SCHEDULED",
    "remark": "備考"
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | employeeId | string | Yes | 社員ID (UUID) |
  | role | string | No | 役割 (max: 100) |
  | assignmentStartDate | string | Yes | 参画開始日 (ISO 8601) |
  | assignmentEndDate | string | No | 参画終了日 (ISO 8601) |
  | workloadPercentage | number | No | 稼働率 (0-100) |
  | unitPrice | number | No | 単価 |
  | billingType | "HOURLY" \| "DAILY" \| "MONTHLY" \| "FIXED" | No | 請求タイプ |
  | status | "SCHEDULED" \| "IN_PROGRESS" \| "COMPLETED" | No | ステータス (デフォルト: SCHEDULED) |
  | remark | string | No | 備考 |
- **レスポンス**: 作成された参画情報 (201)
- **エラー**:
  - BAD_REQUEST (400): 参画終了日は参画開始日以降である必要がある
  - NOT_FOUND (404): 案件が見つからない
  - BAD_REQUEST (400): 指定された社員が見つからない
  - BAD_REQUEST (400): 参画開始日/終了日は案件期間内である必要がある

### PUT /api/projects/:projectId/assignments/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**:
  ```json
  {
    "role": "PL",
    "assignmentStartDate": "2026-04-01",
    "assignmentEndDate": "2026-09-30",
    "workloadPercentage": 80,
    "unitPrice": 900000,
    "billingType": "MONTHLY",
    "status": "IN_PROGRESS",
    "remark": "備考更新"
  }
  ```
- **レスポンス**: 更新された参画情報
- **エラー**:
  - NOT_FOUND (404): 参画情報が見つからない

### DELETE /api/projects/:projectId/assignments/:id
- **認証**: requireAuth + requireEditor
- **リクエスト**: パスパラメータ `projectId`, `id` (UUID)
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": { "message": "参画を解除しました" }
  }
  ```
- **エラー**:
  - NOT_FOUND (404): 参画情報が見つからない

---

## import.ts - インポート

### POST /api/import/preview
- **認証**: requireAuth + requireAdmin
- **リクエスト**:
  ```json
  {
    "data": [
      { "社員番号": "E001", "氏名": "山田太郎", ... }
    ],
    "headerMapping": {
      "社員番号": "employeeNumber",
      "氏名": "fullName"
    }
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | data | array | Yes | CSVデータ行の配列 |
  | headerMapping | object | No | ヘッダーマッピング (デフォルト: 日本語マッピング) |
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "totalRows": 100,
      "validCount": 95,
      "invalidCount": 5,
      "newCount": 90,
      "updateCount": 5,
      "validRows": [
        { "rowIndex": 0, "data": { ... }, "exists": false }
      ],
      "invalidRows": [
        { "rowIndex": 5, "errors": ["エラーメッセージ"], "rawData": { ... } }
      ]
    }
  }
  ```

### POST /api/import/employees
- **認証**: requireAuth + requireAdmin
- **リクエスト**:
  ```json
  {
    "data": [
      { "社員番号": "E001", "氏名": "山田太郎", ... }
    ],
    "headerMapping": {
      "社員番号": "employeeNumber",
      "氏名": "fullName"
    },
    "updateExisting": false
  }
  ```
  | フィールド | 型 | 必須 | 説明 |
  |-----------|-----|------|------|
  | data | array | Yes | CSVデータ行の配列 |
  | headerMapping | object | No | ヘッダーマッピング |
  | updateExisting | boolean | No | 既存レコードを更新するか (デフォルト: false) |
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "totalProcessed": 100,
      "createdCount": 90,
      "updatedCount": 5,
      "skippedCount": 3,
      "errorCount": 2,
      "created": ["E001", "E002"],
      "updated": ["E100"],
      "skipped": ["E050"],
      "errors": [
        { "rowIndex": 10, "employeeNumber": "E999", "error": "エラーメッセージ" }
      ]
    }
  }
  ```

---

## エンドポイント一覧サマリ

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | /health | - | ヘルスチェック |
| GET | /api | - | API情報 |
| GET | /api/tag-categories | - | カテゴリ一覧 (レガシー) |
| GET | /api/stats | - | 統計情報 |
| POST | /api/auth/login | - | ログイン |
| POST | /api/auth/logout | requireAuth | ログアウト |
| GET | /api/auth/me | requireAuth | 現在のユーザー情報 |
| GET | /api/users | requireAdmin | ユーザー一覧 |
| GET | /api/users/:id | requireAdmin | ユーザー詳細 |
| POST | /api/users | requireAdmin | ユーザー作成 |
| PUT | /api/users/:id | requireAdmin | ユーザー更新 |
| DELETE | /api/users/:id | requireAdmin | ユーザー削除 |
| GET | /api/employees | requireAuth | 社員一覧 |
| GET | /api/employees/:id | requireAuth | 社員詳細 |
| POST | /api/employees | requireEditor | 社員作成 |
| PUT | /api/employees/:id | requireEditor | 社員更新 |
| DELETE | /api/employees/:id | requireEditor | 社員削除 |
| POST | /api/employees/:id/skills | requireEditor | スキル追加 |
| DELETE | /api/employees/:id/skills/:skillId | requireEditor | スキル削除 |
| POST | /api/employees/:id/image | requireAdmin | 写真アップロード |
| DELETE | /api/employees/:id/image | requireAdmin | 写真削除 |
| GET | /api/employees/:id/assignments | requireAuth | 社員の参画履歴 |
| GET | /api/tags/categories | requireAuth | カテゴリ一覧 |
| POST | /api/tags/categories | requireEditor | カテゴリ作成 |
| PUT | /api/tags/categories/:id | requireEditor | カテゴリ更新 |
| DELETE | /api/tags/categories/:id | requireEditor | カテゴリ削除 |
| PUT | /api/tags/categories/reorder | requireEditor | カテゴリ並び替え |
| GET | /api/tags | requireAuth | タグ一覧 |
| POST | /api/tags | requireEditor | タグ作成 |
| PUT | /api/tags/:id | requireEditor | タグ更新 |
| DELETE | /api/tags/:id | requireEditor | タグ削除 |
| PUT | /api/tags/reorder | requireEditor | タグ並び替え |
| GET | /api/companies | requireAuth | 企業一覧 |
| GET | /api/companies/:id | requireAuth | 企業詳細 |
| POST | /api/companies | requireEditor | 企業作成 |
| PUT | /api/companies/:id | requireEditor | 企業更新 |
| DELETE | /api/companies/:id | requireEditor | 企業削除 |
| GET | /api/companies/:companyId/offices | requireAuth | 拠点一覧 |
| POST | /api/companies/:companyId/offices | requireEditor | 拠点作成 |
| PUT | /api/companies/:companyId/offices/:id | requireEditor | 拠点更新 |
| DELETE | /api/companies/:companyId/offices/:id | requireEditor | 拠点削除 |
| GET | /api/companies/:companyId/departments | requireAuth | 部署一覧 |
| GET | /api/companies/:companyId/departments/tree | requireAuth | 部署ツリー |
| POST | /api/companies/:companyId/departments | requireEditor | 部署作成 |
| PUT | /api/companies/:companyId/departments/:id | requireEditor | 部署更新 |
| DELETE | /api/companies/:companyId/departments/:id | requireEditor | 部署削除 |
| GET | /api/companies/:companyId/contacts | requireAuth | 担当窓口一覧 |
| POST | /api/companies/:companyId/contacts | requireEditor | 担当窓口作成 |
| PUT | /api/companies/:companyId/contacts/:id | requireEditor | 担当窓口更新 |
| DELETE | /api/companies/:companyId/contacts/:id | requireEditor | 担当窓口削除 |
| GET | /api/projects | requireAuth | 案件一覧 |
| GET | /api/projects/:id | requireAuth | 案件詳細 |
| POST | /api/projects | requireEditor | 案件作成 |
| PUT | /api/projects/:id | requireEditor | 案件更新 |
| DELETE | /api/projects/:id | requireEditor | 案件削除 |
| GET | /api/projects/:projectId/assignments | requireAuth | 参画社員一覧 |
| POST | /api/projects/:projectId/assignments | requireEditor | 参画追加 |
| PUT | /api/projects/:projectId/assignments/:id | requireEditor | 参画更新 |
| DELETE | /api/projects/:projectId/assignments/:id | requireEditor | 参画削除 |
| POST | /api/import/preview | requireAdmin | CSVプレビュー |
| POST | /api/import/employees | requireAdmin | CSVインポート |

**合計: 55 エンドポイント**

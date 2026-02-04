# 認証・ユーザー（Auth/User）モジュール仕様調査レポート

**調査日**: 2026-02-04
**調査対象**: 認証・ユーザー管理機能の全体仕様

---

## 1. 全フィールドの列挙（DB→API→フロントエンド）

### 1.1 データベース（Prisma Schema）

**ファイル**: `backend/prisma/schema.prisma`

```prisma
model User {
  id            String   @id @default(uuid()) @db.Uuid
  email         String   @unique @db.VarChar(255)
  passwordHash  String   @map("password_hash") @db.VarChar(255)
  role          UserRole @default(VIEWER)
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("users")
}

enum UserRole {
  ADMIN   // 管理者（全権限、ユーザー管理含む）
  EDITOR  // 編集者（社員・タグ管理可能、ユーザー管理不可）
  VIEWER  // 閲覧者（読み取りのみ）
}
```

| フィールド名 | DB型 | 制約 | 備考 |
|-------------|------|------|------|
| id | UUID | PK, 自動生成 | |
| email | VARCHAR(255) | UNIQUE, 必須 | |
| passwordHash | VARCHAR(255) | 必須 | DB上は`password_hash` |
| role | ENUM | 必須, デフォルト: VIEWER | ADMIN/EDITOR/VIEWER |
| createdAt | TIMESTAMP | 自動設定 | DB上は`created_at` |

**不整合**: `updatedAt` フィールドが存在しない（他のエンティティには存在する）

---

### 1.2 バックエンドAPI

#### ユーザー管理API（`backend/src/routes/users.ts`）

**レスポンスフィールド（Select）**:
```typescript
select: {
  id: true,
  email: true,
  role: true,
  createdAt: true,
}
```

**作成リクエストスキーマ**:
```typescript
const createUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください'),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).default('VIEWER'),
});
```

**更新リクエストスキーマ**:
```typescript
const updateUserSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください').optional(),
  password: z.string().min(6, 'パスワードは6文字以上で入力してください').optional(),
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']).optional(),
});
```

#### 認証API（`backend/src/routes/auth.ts`）

**ログインリクエストスキーマ**:
```typescript
const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});
```

**ログインレスポンス**:
```typescript
{
  success: true,
  data: {
    token: string,
    user: {
      id: string,
      email: string,
      role: string,
    }
  }
}
```

**現在ユーザー取得レスポンス（/api/auth/me）**:
```typescript
{
  success: true,
  data: {
    id: string,
    email: string,
    role: string,
    createdAt: DateTime,
  }
}
```

---

### 1.3 フロントエンド型定義

#### `frontend/src/types/index.ts`

```typescript
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;      // ★不整合: バックエンドに存在しない
  email: string;
  password: string;
  role: UserRole;
  employeeId?: number;   // ★不整合: バックエンドに存在しない
}

export interface UpdateUserRequest {
  email?: string;
  role?: UserRole;
  employeeId?: number;   // ★不整合: バックエンドに存在しない
  isActive?: boolean;    // ★不整合: バックエンドに存在しない
}

export interface AuthResponse {
  user: User;
  accessToken: string;   // ★不整合: 実際は "token"
  refreshToken: string;  // ★不整合: 実装されていない
  expiresIn: number;     // ★不整合: 実装されていない
}
```

#### `frontend/src/hooks/useUsers.ts`

```typescript
export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
}
```

---

### 1.4 フィールドマッピング表

| フィールド | DB | API Response | FE types/index.ts | FE useUsers.ts |
|-----------|-----|--------------|-------------------|----------------|
| id | UUID | string | string | string |
| email | VARCHAR(255) | string | string | string |
| passwordHash/password | VARCHAR(255) | - (非公開) | - | - |
| role | ENUM | string | UserRole | string literal |
| createdAt | TIMESTAMP | DateTime | string | string |
| username | - | - | string (不整合) | - |
| employeeId | - | - | number (不整合) | - |
| isActive | - | - | boolean (不整合) | - |

---

## 2. 認証フロー

### 2.1 ログインフロー

```
[フロントエンド]                [バックエンド]                [データベース]
     |                              |                            |
     |-- POST /api/auth/login ----->|                            |
     |   { email, password }        |                            |
     |                              |-- findUnique(email) ------>|
     |                              |<--- User or null ----------|
     |                              |                            |
     |                              |-- bcrypt.compare() ------->|
     |                              |<--- boolean ----------------|
     |                              |                            |
     |                              |-- generateToken() -------->|
     |                              |   (JWT sign)               |
     |<-- { token, user } ---------|                            |
     |                              |                            |
     |-- localStorage.setItem() -->|                            |
     |   (access_token)            |                            |
```

### 2.2 認証チェックフロー

```
[フロントエンド]                [バックエンド]                [データベース]
     |                              |                            |
     |-- Request with Bearer ----->|                            |
     |   Authorization header      |                            |
     |                              |-- jwt.verify() ----------->|
     |                              |<--- JwtPayload ------------|
     |                              |                            |
     |                              |-- findUnique(userId) ----->|
     |                              |<--- User or null ----------|
     |                              |                            |
     |                              |-- req.user = user -------->|
     |                              |                            |
     |<-- Response ----------------|                            |
```

### 2.3 JWTトークン構造

**ペイロード**（`backend/src/middleware/auth.ts`）:
```typescript
interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
```

**トークン生成**（`generateToken`関数）:
```typescript
jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
  },
  jwtSecret,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);
```

### 2.4 トークン更新（リフレッシュトークン）

**現状**: **未実装**

- `API_ENDPOINTS.auth.refresh`がフロントエンドに定義されているが、バックエンドに対応するエンドポイントが存在しない
- フロントエンドの`REFRESH_TOKEN_KEY`は使用されていない（localStorageに保存されない）
- `setAuthToken`関数は`refreshToken`パラメータを受け取るが、ログイン時に渡されていない

---

## 3. ロール管理（ADMIN, EDITOR, VIEWER）

### 3.1 ロール定義

| ロール | 説明 | 権限 |
|--------|------|------|
| ADMIN | 管理者 | 全権限（ユーザー管理含む） |
| EDITOR | 編集者 | 社員・タグ・企業・案件管理可能、ユーザー管理不可 |
| VIEWER | 閲覧者 | 読み取りのみ |

### 3.2 認可ミドルウェア

**ファイル**: `backend/src/middleware/auth.ts`

#### `requireAuth`
- 認証必須（ログインしていること）
- JWTトークンの検証
- ユーザー存在確認
- `req.user`にユーザー情報を設定

#### `requireAdmin`
- `requireAuth`の後に使用
- `role === 'ADMIN'` のみ許可
- 403エラー: 「管理者権限が必要です」

#### `requireEditor`
- `requireAuth`の後に使用
- `role === 'ADMIN' || role === 'EDITOR'` を許可
- 403エラー: 「編集権限が必要です」

### 3.3 各APIエンドポイントの権限設定

| エンドポイント | 必要な権限 | ミドルウェア |
|---------------|-----------|-------------|
| POST /api/auth/login | なし | - |
| POST /api/auth/logout | 認証済み | requireAuth |
| GET /api/auth/me | 認証済み | requireAuth |
| GET /api/users | ADMIN | requireAuth + requireAdmin |
| GET /api/users/:id | ADMIN | requireAuth + requireAdmin |
| POST /api/users | ADMIN | requireAuth + requireAdmin |
| PUT /api/users/:id | ADMIN | requireAuth + requireAdmin |
| DELETE /api/users/:id | ADMIN | requireAuth + requireAdmin |

### 3.4 フロントエンドでの権限表示

**ファイル**: `frontend/src/types/index.ts`

```typescript
export const UserRoleLabels: Record<UserRole, string> = {
  ADMIN: '管理者',
  EDITOR: '編集者',
  VIEWER: '閲覧者',
};
```

---

## 4. パスワード要件

### 4.1 バリデーション

| 場所 | 要件 | エラーメッセージ |
|------|------|-----------------|
| ログイン | 1文字以上 | 「パスワードを入力してください」 |
| ユーザー作成 | 6文字以上 | 「パスワードは6文字以上で入力してください」 |
| ユーザー更新 | 6文字以上（入力時のみ） | 「パスワードは6文字以上で入力してください」 |

### 4.2 パスワードハッシュ化

**アルゴリズム**: bcrypt
**ラウンド数**: 10
**実装箇所**: `backend/src/routes/users.ts`

```typescript
const passwordHash = await bcrypt.hash(password, 10);
```

### 4.3 パスワード検証

**実装箇所**: `backend/src/routes/auth.ts`

```typescript
let isValidPassword = false;
try {
  isValidPassword = await bcrypt.compare(password, user.passwordHash);
} catch (bcryptError) {
  // bcryptエラー時も認証エラーとして処理
  throw new AppError('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません', 401);
}
```

### 4.4 パスワード要件の不足

現在の実装では以下が**未実装**:
- 大文字/小文字の混在要件
- 数字を含む要件
- 特殊文字を含む要件
- 連続文字の禁止
- 過去のパスワードとの重複チェック
- パスワード有効期限

---

## 5. ユーザーCRUD

### 5.1 一覧取得（Read List）

**エンドポイント**: `GET /api/users`
**権限**: ADMIN
**クエリパラメータ**:

| パラメータ | 型 | デフォルト | 制限 |
|-----------|-----|----------|------|
| page | number | 1 | 正の整数 |
| limit | number | 20 | 正の整数、最大100 |
| sortBy | string | 'createdAt' | - |
| sortOrder | 'asc' \| 'desc' | 'desc' | - |

**レスポンス**:
```typescript
{
  success: true,
  data: User[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
  }
}
```

### 5.2 詳細取得（Read Detail）

**エンドポイント**: `GET /api/users/:id`
**権限**: ADMIN
**レスポンス**:
```typescript
{
  success: true,
  data: User
}
```

### 5.3 作成（Create）

**エンドポイント**: `POST /api/users`
**権限**: ADMIN
**リクエストボディ**:
```typescript
{
  email: string,    // 必須、有効なメールアドレス
  password: string, // 必須、6文字以上
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' // デフォルト: VIEWER
}
```

**バリデーション**:
- メールアドレス重複チェック

**レスポンス**: 201 Created

### 5.4 更新（Update）

**エンドポイント**: `PUT /api/users/:id`
**権限**: ADMIN
**リクエストボディ**:
```typescript
{
  email?: string,    // 有効なメールアドレス
  password?: string, // 6文字以上
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER'
}
```

**バリデーション**:
- メールアドレス変更時の重複チェック

**レスポンス**: 200 OK

### 5.5 削除（Delete）

**エンドポイント**: `DELETE /api/users/:id`
**権限**: ADMIN

**バリデーション**:
- 自分自身は削除不可（「自分自身のアカウントは削除できません」）

**レスポンス**:
```typescript
{
  success: true,
  data: {
    message: 'ユーザーを削除しました'
  }
}
```

---

## 6. 不整合・実装漏れ一覧

### 6.1 型定義の不整合

| 項目 | 場所 | 問題 | 重要度 |
|------|------|------|--------|
| username | `frontend/src/types/index.ts` CreateUserRequest | バックエンドに存在しない | 高 |
| employeeId | `frontend/src/types/index.ts` CreateUserRequest/UpdateUserRequest | バックエンドに存在しない | 高 |
| isActive | `frontend/src/types/index.ts` UpdateUserRequest | バックエンドに存在しない | 高 |
| accessToken | `frontend/src/types/index.ts` AuthResponse | 実際は "token" | 中 |
| refreshToken | `frontend/src/types/index.ts` AuthResponse | 未実装 | 中 |
| expiresIn | `frontend/src/types/index.ts` AuthResponse | 未実装 | 中 |

### 6.2 未実装機能

| 機能 | 状態 | 備考 |
|------|------|------|
| リフレッシュトークン | 未実装 | フロントエンドにエンドポイント定義あり、バックエンド未実装 |
| パスワード変更API | 未実装 | フロントエンドにエンドポイント定義あり（`changePassword`）、バックエンド未実装 |
| パスワード強度チェック | 未実装 | 最小文字数のみ |
| ユーザーとEmployeeの紐付け | 未実装 | 型定義にemployeeIdがあるがDB・APIに未実装 |
| ユーザーの有効/無効化 | 未実装 | isActiveフィールドが型定義のみ |
| updatedAtフィールド | DB未実装 | 他エンティティには存在する |

### 6.3 セキュリティ上の考慮事項

| 項目 | 状態 | 推奨対応 |
|------|------|---------|
| パスワード要件 | 弱い | 複雑さ要件を追加 |
| トークン失効 | 未実装 | ブラックリストまたはリフレッシュトークン方式を実装 |
| レート制限 | 未確認 | ログイン試行回数制限を追加 |
| アカウントロック | 未実装 | 連続失敗時のロック機能を追加 |
| パスワードリセット | 未実装 | パスワード忘れ機能を追加 |

### 6.4 重複する型定義

- `User`型が`frontend/src/types/index.ts`と`frontend/src/hooks/useUsers.ts`の両方に定義されている
- `CreateUserRequest`と`UpdateUserRequest`も同様に重複

---

## 7. 推奨改善事項

### 7.1 優先度: 高

1. **型定義の統一**
   - `frontend/src/types/index.ts`の`CreateUserRequest`と`UpdateUserRequest`をバックエンドに合わせて修正
   - `useUsers.ts`の型定義を`types/index.ts`からインポートするように変更

2. **AuthResponseの修正**
   - 未使用のフィールド（refreshToken, expiresIn）を削除するか、バックエンドを実装

### 7.2 優先度: 中

3. **updatedAtフィールドの追加**
   - DBスキーマとAPIレスポンスに追加

4. **パスワード変更APIの実装**
   - `PUT /api/users/:id/password`
   - 現在のパスワード確認を含める

5. **リフレッシュトークンの実装**（または削除）
   - 長期セッションが必要な場合は実装
   - 不要な場合はフロントエンドから定義を削除

### 7.3 優先度: 低

6. **パスワード強度チェックの強化**
   - 正規表現による複雑さチェック

7. **ユーザーと社員の紐付け**（将来実装）
   - DBスキーマにemployeeIdを追加
   - APIでの関連付け処理を実装

---

## 8. 参照ファイル一覧

| ファイルパス | 説明 |
|-------------|------|
| `backend/prisma/schema.prisma` | データベーススキーマ定義 |
| `backend/src/routes/auth.ts` | 認証API |
| `backend/src/routes/users.ts` | ユーザー管理API |
| `backend/src/middleware/auth.ts` | 認証・認可ミドルウェア |
| `frontend/src/types/index.ts` | フロントエンド型定義 |
| `frontend/src/pages/UserManagement.tsx` | ユーザー管理画面 |
| `frontend/src/pages/Login.tsx` | ログイン画面 |
| `frontend/src/hooks/useAuth.tsx` | 認証フック（Context） |
| `frontend/src/hooks/useUsers.ts` | ユーザー管理フック |
| `frontend/src/api/config.ts` | API設定・エンドポイント定義 |

---

**調査完了日時**: 2026-02-04

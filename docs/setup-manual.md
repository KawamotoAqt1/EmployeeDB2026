# Git クローン後のシステム起動マニュアル

社員データベース Web アプリを、リポジトリをクローンした環境で起動する手順です。

---

## 前提条件

- **Node.js** 18 以上（推奨: 20 LTS）
- **npm** 9 以上
- **Docker** と **Docker Compose**（PostgreSQL 用）
- **Git**

---

## 1. リポジトリのクローン

```bash
git clone <リポジトリURL>
cd EmployeeDB2026
```

※ 実際のリポジトリ名・パスに読み替えてください。

---

## 2. データベース（PostgreSQL）の起動

プロジェクトルートで Docker Compose を実行し、PostgreSQL を起動します。

```bash
docker-compose up -d
```

- 初回は PostgreSQL イメージのダウンロードで数分かかることがあります。
- コンテナ名: `employee-db-postgres`
- ホスト側ポート: **5433**（コンテナ内は 5432）

起動確認:

```bash
docker ps
```

`employee-db-postgres` が表示されていれば OK です。

---

## 3. バックエンドの設定と起動

### 3.1 ディレクトリに移動

```bash
cd backend
```

**以降のバックエンド用コマンドは、すべて `backend` ディレクトリで実行します。**

### 3.2 環境変数ファイル（.env）の作成

`backend` フォルダに `.env` を作成します。`.env.example` をコピーして編集しても構いません。

```bash
# Windows (PowerShell)
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

**.env の内容**（`docker-compose.yml` の DB 設定に合わせる）:

```env
# Database（ホスト側ポート 5433、ユーザー・DB 名は docker-compose に合わせる）
DATABASE_URL="postgresql://employee_user:employee_pass@localhost:5433/employee_db?schema=public"

# Server
PORT=3001
NODE_ENV=development

# JWT（本番では必ず変更すること）
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS（フロントのオリジン。カンマ区切りで複数指定可）
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Bcrypt
BCRYPT_SALT_ROUNDS=12
```

- `DATABASE_URL` のポートは **5433**（docker-compose の `ports: "5433:5432"` に合わせる）。
- ユーザー名・パスワード・DB 名は `docker-compose.yml` の `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` と一致させてください。

### 3.3 依存関係のインストール

```bash
npm install
```

### 3.4 データベースのマイグレーション（テーブル作成）

初回またはマイグレーション未実行の場合は、以下でテーブルを作成します。

```bash
npx prisma migrate dev --name init
```

- 既に `prisma/migrations` がある場合は、次のコマンドでも構いません。
  ```bash
  npx prisma migrate deploy
  ```

### 3.5 初期データの投入（シード）

管理者ユーザーとサンプルデータを投入します。

```bash
npm run prisma:seed
```

- 管理者: **admin@example.com** / **password123**
- タグカテゴリ・タグ・企業・案件・社員などのサンプルデータも作成されます。

### 3.6 バックエンドサーバーの起動

```bash
npm run dev
```

- 起動に成功すると、次のように表示されます。
  - `Server running on: http://localhost:3001`
  - `Health check: http://localhost:3001/health`
- **このターミナルは閉じずに起動したままにしてください。**

---

## 4. フロントエンドの設定と起動

**別のターミナル**を開いて作業します。

### 4.1 ディレクトリに移動

```bash
cd frontend
```

※ プロジェクトルートから `cd frontend` で移動します。

### 4.2 環境変数（任意）

API の URL を変えたい場合のみ、`frontend/.env` を作成します。

```env
# バックエンドの API ベース URL（未設定時は http://localhost:3001/api）
VITE_API_BASE_URL=http://localhost:3001/api
```

- 未設定の場合は `http://localhost:3001/api` が使われます。

### 4.3 依存関係のインストール

```bash
npm install
```

### 4.4 フロントエンドの起動

```bash
npm run dev
```

- ブラウザが自動で開くか、表示された URL（例: `http://localhost:5173`）にアクセスします。

---

## 5. ログイン

ブラウザでログイン画面が表示されたら、次のアカウントでログインします。

| 項目           | 値                    |
|----------------|------------------------|
| メールアドレス | `admin@example.com`   |
| パスワード     | `password123`         |

---

## 6. 起動コマンド一覧（まとめ）

| 順番 | ターミナル | 作業場所   | コマンド |
|------|------------|------------|----------|
| 1    | 1          | プロジェクトルート | `docker-compose up -d` |
| 2    | 2          | backend    | `npm install` |
| 3    | 2          | backend    | `npx prisma migrate dev --name init`（初回）または `npx prisma migrate deploy` |
| 4    | 2          | backend    | `npm run prisma:seed` |
| 5    | 2          | backend    | `npm run dev` |
| 6    | 3          | frontend   | `npm install` |
| 7    | 3          | frontend   | `npm run dev` |

---

## 7. トラブルシューティング

### 7.1 バックエンド起動時に「Environment variable not found: DATABASE_URL」

- **原因**: `backend/.env` が存在しないか、`DATABASE_URL` が未設定。
- **対処**: 「3.2 環境変数ファイル（.env）の作成」のとおり、`backend/.env` を作成し、`DATABASE_URL` を設定する。ポートは **5433** にすること。

### 7.2 ログイン時に「The table `public.users` does not exist」

- **原因**: マイグレーション未実行で、テーブルが作成されていない。
- **対処**: `backend` で以下を実行する。
  ```bash
  npx prisma migrate dev --name init
  npm run prisma:seed
  ```
  その後、バックエンドを再起動する。

### 7.3 CORS エラー（Access-Control-Allow-Origin）

- **原因**: フロントのオリジン（例: `http://localhost:3000`）がバックエンドの許可リストに含まれていない。
- **対処**: `backend/.env` の `CORS_ORIGIN` に、フロントの URL をカンマ区切りで追加する。
  ```env
  CORS_ORIGIN=http://localhost:3000,http://localhost:5173
  ```
  変更後、バックエンドを再起動する。

### 7.4 ログイン時に 500 Internal Server Error

- **原因**: DB 未起動、マイグレーション未実行、シード未実行、または環境変数の不備。
- **対処**:
  1. `docker ps` で PostgreSQL が起動しているか確認する。
  2. `backend` で `npx prisma migrate deploy` と `npm run prisma:seed` を実行する。
  3. バックエンドのターミナルに表示されるエラーメッセージを確認する。ブラウザの開発者ツール → Network → login の Response にも詳細が出る。

### 7.5 Prisma コマンドで「Could not find Prisma Schema」

- **原因**: プロジェクトルートなど、`backend` 以外のディレクトリで実行している。
- **対処**: 必ず `backend` に移動してから実行する。
  ```bash
  cd backend
  npx prisma migrate dev --name init
  ```

---

## 8. 参考

- プロジェクト概要・技術スタック: ルートの `CLAUDE.md`
- データベース設計（案件・企業）: `docs/database-design-projects.md`

---

**最終更新**: 2026-02-03

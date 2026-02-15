# Xserver VPS デプロイガイド

本ドキュメントは、社員データベース Webアプリケーション（React + Express + PostgreSQL）を Xserver VPS にデプロイする手順を記載します。

## 全体構成

```
インターネット
    │
    ▼
[Xserver VPS (Ubuntu)]
    │
    ├── Nginx (ポート 80/443)
    │     ├── /         → フロントエンド（静的ファイル配信）
    │     ├── /api      → バックエンド（localhost:3001 へリバースプロキシ）
    │     └── /uploads  → アップロード画像の配信
    │
    ├── Node.js + PM2 (ポート 3001)
    │     └── Express バックエンド
    │
    └── PostgreSQL (ポート 5432)
          └── employee_db
```

### 推奨スペック

| 項目 | 値 |
|------|------|
| プラン | 2GB メモリ以上 |
| OS | Ubuntu 25.04 |

---

## Step 0: Xserver VPS の契約・初期設定

### 0-1. VPS を契約

1. [Xserver VPS](https://vps.xserver.ne.jp/) にアクセスし契約
2. プラン選択: **2GB プラン以上**（Node.js + PostgreSQL + Nginx を動かすため）
3. OS 選択: **Ubuntu 25.04**
4. root パスワードを設定し、メモしておく

### 0-2. SSH 接続情報を確認

契約完了後、Xserver VPS パネルで以下を確認する。

- **IP アドレス**: `xxx.xxx.xxx.xxx`
- **SSH ポート**: 通常 `22`

---

## Step 1: VPS に SSH 接続する

### 1-1. 接続

ローカル PC（Windows Terminal / Git Bash）から実行:

```bash
ssh root@xxx.xxx.xxx.xxx
```

契約時に設定した root パスワードを入力する。

### 1-2. SSH 鍵認証を設定する（推奨）

パスワード認証よりも安全な鍵認証を設定する。

**ローカル PC で実行:**

```bash
# 鍵ペアを生成
ssh-keygen -t ed25519 -C "your-email@example.com"

# 公開鍵をサーバーに転送
ssh-copy-id root@xxx.xxx.xxx.xxx
```

以降はパスワードなしで SSH 接続できる。

---

## Step 2: サーバーの初期セットアップ

### 2-1. システムを最新化

```bash
apt update && apt upgrade -y
```

### 2-2. 作業用ユーザーを作成

root で運用するのはセキュリティ上危険なため、専用ユーザーを作成する。

```bash
# ユーザー作成（パスワード以外の質問は Enter でスキップ可）
adduser deploy

# sudo 権限を付与
usermod -aG sudo deploy

# SSH 鍵をコピー
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

以降は `deploy` ユーザーで作業する:

```bash
# ローカル PC から
ssh deploy@xxx.xxx.xxx.xxx
```

### 2-3. ファイアウォール設定

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# 確認
sudo ufw status
```

> **注意**: Xserver VPS パネル側にもファイアウォール設定がある場合は、パネル上でもポート 80, 443, 22 を開放すること。

---

## Step 3: 必要なソフトウェアをインストール

### 3-1. Node.js（v20 LTS）

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 確認
node -v   # v20.x.x
npm -v    # 10.x.x
```

### 3-2. PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 確認
sudo systemctl status postgresql
```

### 3-3. Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# 確認（ブラウザで http://xxx.xxx.xxx.xxx にアクセスして Nginx デフォルトページが見えれば OK）
sudo systemctl status nginx
```

### 3-4. PM2（Node.js プロセスマネージャ）

```bash
sudo npm install -g pm2
```

### 3-5. Git

```bash
sudo apt install -y git
```

---

## Step 4: PostgreSQL のデータベースを作成

```bash
sudo -u postgres psql
```

以下の SQL を実行する（パスワードは必ず変更すること）:

```sql
-- ユーザー作成
CREATE USER employee_user WITH PASSWORD '強力なパスワードをここに設定';

-- データベース作成
CREATE DATABASE employee_db OWNER employee_user;

-- 権限付与
GRANT ALL PRIVILEGES ON DATABASE employee_db TO employee_user;

-- 終了
\q
```

**パスワード例**: `Kj8#mPx2$nQw9vL!`（推測されにくいランダムな文字列を使用）

---

## Step 5: プロジェクトをサーバーに配置

### 5-1. リポジトリをクローン

```bash
sudo mkdir -p /var/www
sudo chown deploy:deploy /var/www
cd /var/www

git clone https://github.com/KawamotoAqt1/EmployeeDB2026.git
cd EmployeeDB2026
```

> プライベートリポジトリの場合は GitHub Personal Access Token または SSH 鍵での認証が必要。

### 5-2. バックエンド環境変数を設定

```bash
nano /var/www/EmployeeDB2026/backend/.env
```

以下を記入する（各値を本番用に変更すること）:

```env
# Database（Step 4 で設定したパスワードに合わせる）
DATABASE_URL="postgresql://employee_user:パスワード@localhost:5432/employee_db?schema=public"

# Server
PORT=3001
NODE_ENV=production

# JWT（必ずランダムな文字列に変更）
JWT_SECRET=ランダムな64文字以上の文字列
JWT_EXPIRES_IN=7d

# CORS（本番ドメインに変更）
CORS_ORIGIN=https://yourdomain.com

# Bcrypt
BCRYPT_SALT_ROUNDS=12
```

**JWT_SECRET の生成方法:**

```bash
openssl rand -base64 64
```

出力された文字列を `JWT_SECRET` に設定する。

### 5-3. フロントエンド環境変数を設定

```bash
nano /var/www/EmployeeDB2026/frontend/.env.production
```

```env
VITE_API_BASE_URL=https://yourdomain.com/api
VITE_APP_TITLE=Employee Database
VITE_APP_VERSION=1.0.0
```

> ドメインがまだない場合は `http://xxx.xxx.xxx.xxx/api`（VPS の IP）で仮設定する。

---

## Step 6: バックエンドをビルド・起動

```bash
cd /var/www/EmployeeDB2026/backend

# 依存パッケージをインストール
npm install

# Prisma Client を生成
npx prisma generate

# データベースマイグレーション（テーブル作成）
npx prisma migrate deploy

# シードデータ投入（初期ユーザー・タグデータ等）
npx prisma db seed

# TypeScript をコンパイル
npm run build

# uploads ディレクトリを作成（写真アップロード用）
mkdir -p uploads
```

### PM2 でバックエンドを常駐起動

```bash
# 起動
pm2 start dist/index.js --name employee-api

# 動作確認
pm2 status
pm2 logs employee-api

# サーバー再起動時に自動起動する設定
pm2 startup
# ↑ 表示されたコマンドをそのままコピーして実行する
pm2 save
```

**接続テスト:**

```bash
curl http://localhost:3001/api/health
# レスポンスが返れば OK
```

---

## Step 7: フロントエンドをビルド

```bash
cd /var/www/EmployeeDB2026/frontend

# 依存パッケージをインストール
npm install

# 本番ビルド
npm run build
```

`frontend/dist/` に HTML/JS/CSS ファイルが生成される。

---

## Step 8: Nginx を設定

### 8-1. 設定ファイルを作成

```bash
sudo nano /etc/nginx/sites-available/employee-db
```

以下を貼り付ける:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # ドメインまたは IP アドレスに変更

    # フロントエンド（静的ファイル配信）
    root /var/www/EmployeeDB2026/frontend/dist;
    index index.html;

    # アップロードファイルのサイズ上限（写真アップロード用）
    client_max_body_size 10M;

    # API リクエストをバックエンドに転送
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # アップロードされた画像の配信
    location /uploads {
        alias /var/www/EmployeeDB2026/backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # React Router 対応（SPA のため全パスを index.html に返す）
    location / {
        try_files $uri $uri/ /index.html;
    }

    # gzip 圧縮
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 256;
}
```

### 8-2. 設定を有効化

```bash
# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/employee-db /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm /etc/nginx/sites-enabled/default

# 文法チェック
sudo nginx -t

# 再起動
sudo systemctl restart nginx
```

この時点で `http://xxx.xxx.xxx.xxx` にアクセスするとアプリが表示される。

---

## Step 9: ドメインを設定する（任意・推奨）

### 9-1. ドメインを取得

Xserver Domain、お名前.com、ムームードメインなど任意のレジストラで取得する。

### 9-2. DNS の A レコードを設定

ドメインの DNS 管理画面で以下を設定する:

| ホスト名 | タイプ | 値 |
|---------|--------|-----|
| `@` | A | `xxx.xxx.xxx.xxx`（VPS の IP） |
| `www` | A | `xxx.xxx.xxx.xxx`（VPS の IP） |

> DNS 反映には数分〜最大 48 時間かかるが、通常は 30 分以内。

### 9-3. Nginx の server_name を更新

```bash
sudo nano /etc/nginx/sites-available/employee-db
```

`server_name` を変更:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

```bash
sudo nginx -t && sudo systemctl restart nginx
```

---

## Step 10: SSL 証明書を設定（HTTPS 化）

Let's Encrypt で無料の SSL 証明書を取得する。

### 10-1. Certbot をインストール

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 10-2. 証明書を取得

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

対話式の質問:

1. **メールアドレス**: 証明書期限通知に使うメールを入力
2. **利用規約に同意**: `Y`
3. **メール共有**: `N`
4. **HTTP リダイレクト**: `2`（HTTP → HTTPS に自動リダイレクト）

### 10-3. 自動更新を確認

```bash
sudo certbot renew --dry-run
```

証明書は 90 日ごとに自動更新される。

---

## Step 11: CORS 設定を本番ドメインに更新

```bash
nano /var/www/EmployeeDB2026/backend/.env
```

`CORS_ORIGIN` を確定したドメインに変更:

```env
CORS_ORIGIN=https://yourdomain.com
```

```bash
pm2 restart employee-api
```

---

## Step 12: 初期管理者ユーザーの確認

シードデータに管理者ユーザーが含まれていることを確認する。

```bash
cd /var/www/EmployeeDB2026/backend
npx prisma db seed
```

直接 DB で確認する場合:

```bash
sudo -u postgres psql -d employee_db -c "SELECT email, role FROM users;"
```

---

## 運用コマンド集

### 状態確認

```bash
# バックエンドのプロセス状態
pm2 status

# バックエンドのログ（直近のログ）
pm2 logs employee-api --lines 50

# Nginx の状態
sudo systemctl status nginx

# PostgreSQL の状態
sudo systemctl status postgresql
```

### コード更新時のデプロイ手順

```bash
cd /var/www/EmployeeDB2026

# 最新コードを取得
git pull origin main

# --- バックエンド更新 ---
cd backend
npm install
npx prisma migrate deploy   # 新しいマイグレーションがある場合
npm run build
pm2 restart employee-api

# --- フロントエンド更新 ---
cd ../frontend
npm install
npm run build
# Nginx は静的ファイルを配信しているだけなので再起動不要
```

### バックエンドの再起動

```bash
pm2 restart employee-api
```

### Nginx の再起動

```bash
sudo nginx -t && sudo systemctl restart nginx
```

### PostgreSQL のバックアップ

```bash
# バックアップ
sudo -u postgres pg_dump employee_db > ~/backup_$(date +%Y%m%d).sql

# リストア
sudo -u postgres psql employee_db < ~/backup_20260215.sql
```

---

## トラブルシューティング

| 症状 | 確認方法 | 対処 |
|------|---------|------|
| サイトにアクセスできない | `sudo ufw status` | ポート 80/443 が開いているか確認。VPS パネルのファイアウォールも確認 |
| 502 Bad Gateway | `pm2 status` | バックエンドが起動しているか確認。`pm2 logs employee-api` でエラーを確認 |
| API がエラーを返す | `pm2 logs employee-api --lines 100` | バックエンドのエラーログを確認 |
| DB 接続エラー | `sudo systemctl status postgresql` | PostgreSQL が起動しているか確認。`.env` の `DATABASE_URL` が正しいか確認 |
| 画像が表示されない | `ls -la /var/www/EmployeeDB2026/backend/uploads` | uploads ディレクトリの権限を確認 |
| フロントが白画面 | ブラウザの開発者ツール → Console | ビルドエラーや `VITE_API_BASE_URL` の設定ミスを確認 |
| CORS エラー | ブラウザの開発者ツール → Network | `.env` の `CORS_ORIGIN` がフロントのドメインと一致しているか確認 |

---

## セキュリティチェックリスト

- [ ] SSH 鍵認証を設定し、root のパスワードログインを無効化
- [ ] `.env` の `JWT_SECRET` をランダムな値に変更済み
- [ ] PostgreSQL のパスワードを強力なものに設定済み
- [ ] UFW ファイアウォールが有効（22, 80, 443 のみ開放）
- [ ] HTTPS（Let's Encrypt）が有効
- [ ] `NODE_ENV=production` に設定済み
- [ ] `.env` ファイルが Git に含まれていないことを確認（`.gitignore` に記載）

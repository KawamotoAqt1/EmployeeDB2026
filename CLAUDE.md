# 社員データベース Webアプリ開発ログ

## プロジェクト概要

SharePointリストベースの社員データベースをWebアプリケーションとして再構築。スキル管理をタグベースに改善し、検索性と管理性を向上させるプロジェクト。

### 技術スタック

- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Node.js + Express + TypeScript
- **データベース**: PostgreSQL
- **ORM**: Prisma
- **認証**: JWT (ADMIN/EDITOR/VIEWER の3ロール)

## Phase 1: 社員DB + タグシステム（実装済み）

### 1. 基本機能実装

#### 社員管理
- ✅ 社員一覧表示（ページネーション対応）
- ✅ 社員詳細表示
- ✅ 社員登録（ADMIN/EDITOR権限）
- ✅ 社員編集（ADMIN/EDITOR権限）
- ✅ 社員削除（ADMIN/EDITOR権限）
- ✅ 写真アップロード対応

#### スキル・タグ管理
- ✅ スキルタグ付与（複数選択 + レベル設定）
  - レベル: 未経験/微経験(1～3年未満)/中堅(3～5年)/ベテラン(5年以上)
- ✅ タグマスタ管理（追加・編集・削除）
- ✅ カテゴリ管理（PROC, TECH, LEVEL等）

#### 認証・権限管理
- ✅ JWT認証
- ✅ 3つのロール実装
  - **ADMIN**: 全権限（ユーザー管理含む）
  - **EDITOR**: 社員・タグ管理可能（ユーザー管理不可）
  - **VIEWER**: 閲覧のみ
- ✅ ユーザー管理機能（ADMIN専用）

### 2. 検索・フィルタ機能（高度化）

#### 実装済み機能
- ✅ **自動検索（デバウンス300ms）** - 検索ボタンなしで即座に反映
- ✅ **全フィールド検索** - 以下すべてのフィールドを検索対象に
  - 氏名、氏名カナ、社員番号、メール
  - 部署、役職、勤務地、国
  - 住所、最寄り駅、備考
- ✅ **部分一致/先頭一致の切り替え** - テキストボックス右側のトグルボタンで選択
- ✅ **部署・役職・ステータスフィルタ** - ドロップダウン選択
- ✅ **スキルタグ検索（AND条件）** - 複数タグは全て一致する社員を検索
- ✅ カテゴリ別タグ選択UI
- ✅ 選択中タグの視覚的表示

### 3. データベース設計（社員DB）

#### employees（社員）テーブル
| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| employee_number | VARCHAR | 社員番号 |
| employee_unique_number | VARCHAR | 社員固有番号 |
| full_name | VARCHAR | 氏名 |
| full_name_kana | VARCHAR | 氏名カナ |
| email | VARCHAR | メール |
| birth_date | DATE | 生年月日 |
| gender | ENUM | 男性/女性/設定なし |
| contract_type | ENUM | 正社員/契約社員/BP |
| department | ENUM | 部署 |
| position | ENUM | 役職 |
| location | ENUM | 勤務地 |
| country | ENUM | 国 |
| residence | TEXT | 住所 |
| station | VARCHAR | 最寄り駅 |
| hire_date | DATE | 入社日 |
| contract_end_date | DATE | 契約終了日 |
| status | ENUM | 在籍/休職/退職（求職）/退職 |
| remark | TEXT | 備考 |
| photo_url | VARCHAR | 写真URL |

#### タグシステム
- **tag_categories**: タグカテゴリ（PROC, TECH等）
- **tags**: タグマスタ（要件定義、Java、Python等）
- **employee_skills**: 社員とタグの紐付け + スキルレベル

#### users（認証）テーブル
- email, password_hash, role (ADMIN/EDITOR/VIEWER)

### 4. 主要な実装ファイル

#### バックエンド
- `backend/prisma/schema.prisma` - データベーススキーマ定義
- `backend/src/routes/employees.ts` - 社員API（requireEditor適用）
- `backend/src/routes/tags.ts` - タグAPI（requireEditor適用）
- `backend/src/routes/users.ts` - ユーザー管理API（requireAdmin適用）
- `backend/src/middleware/auth.ts` - 認証・認可ミドルウェア
  - `requireAuth` - ログイン必須
  - `requireAdmin` - ADMIN専用
  - `requireEditor` - ADMIN/EDITOR専用

#### フロントエンド
- `frontend/src/App.tsx` - ルーティング定義
  - `AdminRoute` - ADMIN専用ルート
  - `EditorRoute` - ADMIN/EDITOR専用ルート
- `frontend/src/components/employee/EmployeeFilter.tsx` - 検索フィルタ
  - デバウンス自動検索
  - 部分一致/先頭一致トグル
  - タグAND検索
- `frontend/src/pages/UserManagement.tsx` - ユーザー管理画面
- `frontend/src/hooks/useUsers.ts` - ユーザー管理カスタムフック
- `frontend/src/types/index.ts` - 型定義
  - `UserRole`, `MatchType`, `TagOperator`

### 5. 技術的なポイント

#### 検索機能の実装
```typescript
// 自動検索（デバウンス300ms）
useEffect(() => {
  const timer = setTimeout(() => {
    executeSearch();
  }, 300);
  return () => clearTimeout(timer);
}, [keyword, department, position, status, selectedTagIds, matchType, executeSearch]);
```

#### 全フィールド検索
```typescript
// バックエンド: 部分一致または先頭一致
if (q) {
  const searchMode = matchType === 'prefix' ? 'startsWith' : 'contains';
  whereClause.OR = [
    { fullName: { [searchMode]: q, mode: 'insensitive' } },
    { fullNameKana: { [searchMode]: q, mode: 'insensitive' } },
    { employeeNumber: { [searchMode]: q, mode: 'insensitive' } },
    { email: { [searchMode]: q, mode: 'insensitive' } },
    { department: { [searchMode]: q, mode: 'insensitive' } },
    { position: { [searchMode]: q, mode: 'insensitive' } },
    { location: { [searchMode]: q, mode: 'insensitive' } },
    { country: { [searchMode]: q, mode: 'insensitive' } },
    { residence: { [searchMode]: q, mode: 'insensitive' } },
    { station: { [searchMode]: q, mode: 'insensitive' } },
    { remark: { [searchMode]: q, mode: 'insensitive' } },
  ];
}
```

#### 役割ベースアクセス制御
```typescript
// EDITOR権限チェック（ADMIN/EDITOR両方許可）
export const requireEditor = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: '認証が必要です' } });
    return;
  }
  if (req.user.role !== 'ADMIN' && req.user.role !== 'EDITOR') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: '編集権限が必要です' } });
    return;
  }
  next();
};
```

## Phase 2: 案件・企業DB（設計完了、実装待ち）

### データベース設計

詳細は `docs/database-design-projects.md` を参照

#### 主要テーブル（6テーブル）

1. **companies（企業）** - 企業基本情報
2. **company_offices（拠点）** - 企業の拠点情報
3. **company_departments（部署）** - 階層構造対応（自己参照）
4. **company_contacts（担当窓口）** - 企業・部署の担当者（複数登録可）
5. **projects（案件）** - 案件情報（契約形態、期間等）
6. **project_assignments（案件参画）** - 社員と案件の紐付け（履歴管理）

#### 主要な設計ポイント

- **階層構造**: `company_departments` が自己参照で事業部→部→課を表現
- **双方向参照**: 社員→案件履歴、案件→参画社員リストの両方向で検索可能
- **履歴管理**: `project_assignments` で開始日・終了日を管理し過去の参画履歴を保持
- **契約形態**: 派遣、準委任、請負をENUMで管理
- **複数担当窓口**: 企業や部署ごとに複数の担当者を登録可能

### 今後の実装予定

#### Step 1: バックエンド実装
- [ ] Prismaスキーマ追加（6テーブル）
- [ ] マイグレーション実行
- [ ] 企業管理API実装
- [ ] 案件管理API実装
- [ ] 参画履歴API実装

#### Step 2: フロントエンド実装
- [ ] 企業一覧・詳細画面
- [ ] 企業登録・編集フォーム（階層構造UI）
- [ ] 案件一覧・詳細画面
- [ ] 案件登録・編集フォーム
- [ ] 社員詳細画面に参画履歴表示
- [ ] 案件詳細画面に参画社員リスト表示

#### Step 3: 高度な検索機能
- [ ] 企業・案件横断検索
- [ ] スキルマッチング（案件に必要なスキルを持つ社員検索）
- [ ] 稼働率計算・表示
- [ ] 期間指定での参画履歴検索

### 将来的な拡張案

- 売上管理テーブル（project_revenues）
- 工数管理テーブル（work_logs）
- 評価管理テーブル（evaluations）
- 契約書類管理機能
- ダッシュボード（売上推移、稼働率グラフ等）

## ディレクトリ構成

```
EmployeeDB/
├── docs/
│   ├── requirements.md                    # 要件定義書
│   ├── database-design-projects.md        # 案件・企業DB設計書
│   └── dropdown-data-reference-fix.md     # ドロップダウン問題修正レポート
├── frontend/
│   ├── src/
│   │   ├── components/              # UIコンポーネント
│   │   │   ├── employee/            # 社員関連コンポーネント
│   │   │   ├── layout/              # レイアウトコンポーネント
│   │   │   └── ui/                  # 共通UIコンポーネント
│   │   ├── pages/                   # ページコンポーネント
│   │   ├── hooks/                   # カスタムフック
│   │   ├── api/                     # API呼び出しロジック
│   │   └── types/                   # TypeScript型定義
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/                  # APIルート定義
│   │   ├── controllers/             # コントローラー
│   │   ├── services/                # ビジネスロジック
│   │   ├── middleware/              # 認証・認可等
│   │   └── prisma/                  # Prismaスキーマ・マイグレーション
│   └── package.json
├── docker-compose.yml               # PostgreSQL環境
└── claude.md                        # このファイル
```

## 実装履歴

### 初期実装
1. 環境構築（Node.js, PostgreSQL, Docker）
2. Prismaスキーマ作成・マイグレーション
3. 基本的な社員CRUD API実装
4. フロントエンド基本画面実装

### 機能追加・改善

#### 検索機能の段階的改善
1. 検索ボタン削除 → 自動検索（デバウンス）実装
2. タグ検索をOR条件 → AND条件に変更
3. 部分一致のみ → 先頭一致/部分一致トグル追加
4. トグルボタンの配置調整（テキストボックス右側）
5. 名前のみ検索 → 全フィールド検索に拡張

#### 権限管理の強化
1. ADMIN/VIEWER の2ロール → EDITOR追加で3ロール体制
2. ユーザー管理機能追加（ADMIN専用）
3. 社員・タグ管理にEDITOR権限付与
4. ミドルウェア `requireEditor` 追加

#### データベース設計
1. Phase 1（社員DB）設計・実装完了
2. Phase 2（案件・企業DB）設計完了、実装待ち

## 開発メモ

### トラブルシューティング

#### Prisma Client生成エラー
- **事象**: マイグレーション後にEPERMエラー
- **原因**: バックエンドサーバー起動中でDLLファイルがロック
- **対処**: マイグレーション自体は成功。サーバー再起動でClient自動生成

#### ドロップダウンのデータ参照問題（2026-02-02修正）
- **事象**: ProjectForm.tsx の企業選択ドロップダウンにデータが表示されない
- **原因**: フロントエンドが `limit: 1000` をリクエストしたが、バックエンドの Zod スキーマは `max: 100` に制限
- **対処**: `useCompanies({ limit: 1000 })` を `useCompanies({ limit: 100 })` に修正
- **詳細**: `docs/dropdown-data-reference-fix.md` を参照

### ベストプラクティス

- **デバウンス**: ユーザー入力に対して300msのデバウンスで快適な検索体験
- **UUID**: 主キーに整数ではなくUUIDを使用し、分散環境でもID衝突を回避
- **ロールベース**: ミドルウェアで権限チェックを集約、ルート定義をシンプルに
- **自己参照テーブル**: 階層構造を柔軟に表現（company_departments）
- **ブリッジテーブル**: 多対多 + 属性（日付等）は中間テーブルで管理

## 次のアクション

Phase 2（案件・企業DB）の実装承認待ち。設計完了後、以下の順で実装予定:
1. Prismaスキーマ追加
2. マイグレーション実行
3. バックエンドAPI実装
4. フロントエンド画面実装
5. 統合テスト

---

**最終更新**: 2026-02-02

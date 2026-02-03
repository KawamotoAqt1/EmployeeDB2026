# API動作確認スクリプト

このドキュメントは、案件管理機能のAPIエンドポイントが正常に動作するかを確認するためのcurlコマンド集です。

## 前提条件

1. バックエンドサーバーが起動している (http://localhost:3000)
2. 認証トークンを取得済み

## 認証トークンの取得

```bash
# ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your-password"
  }'

# レスポンスからaccessTokenを取得し、以下の変数に設定
export TOKEN="your-access-token-here"
```

## 案件API テストコマンド

### 1. 案件一覧取得

```bash
# 基本的な一覧取得
curl -X GET "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN"

# ページネーション付き
curl -X GET "http://localhost:3000/api/projects?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# キーワード検索
curl -X GET "http://localhost:3000/api/projects?keyword=test" \
  -H "Authorization: Bearer $TOKEN"

# ステータスフィルタ
curl -X GET "http://localhost:3000/api/projects?status=ACTIVE" \
  -H "Authorization: Bearer $TOKEN"

# 契約形態フィルタ
curl -X GET "http://localhost:3000/api/projects?contractType=DISPATCH" \
  -H "Authorization: Bearer $TOKEN"

# 複合フィルタ
curl -X GET "http://localhost:3000/api/projects?status=ACTIVE&contractType=SES&keyword=プロジェクト" \
  -H "Authorization: Bearer $TOKEN"
```

### 2. 案件詳細取得

```bash
# 案件IDを指定して取得
curl -X GET "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 案件作成

```bash
# 必須項目のみ
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "テスト案件",
    "contractType": "DISPATCH"
  }'

# すべての項目を含む
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "departmentId": "{department-id}",
    "name": "新規案件A",
    "description": "案件の詳細説明",
    "status": "ACTIVE",
    "contractType": "SES",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "remark": "備考欄のテキスト"
  }'
```

### 4. 案件更新

```bash
# 一部のフィールドを更新
curl -X PATCH "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新後の案件名",
    "status": "INACTIVE"
  }'

# すべてのフィールドを更新
curl -X PATCH "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "完全更新案件",
    "description": "更新後の説明",
    "status": "COMPLETED",
    "contractType": "CONTRACT",
    "startDate": "2026-02-01",
    "endDate": "2026-11-30",
    "remark": "更新後の備考"
  }'
```

### 5. 案件削除

```bash
curl -X DELETE "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $TOKEN"
```

## 社員アサインメントAPI テストコマンド

### 6. 社員を案件に追加

```bash
# 必須項目のみ
curl -X POST "http://localhost:3000/api/projects/{project-id}/assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "{employee-id}",
    "startDate": "2026-02-01"
  }'

# すべての項目を含む
curl -X POST "http://localhost:3000/api/projects/{project-id}/assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "{employee-id}",
    "startDate": "2026-02-01",
    "endDate": "2026-12-31",
    "role": "プロジェクトリーダー",
    "workload": 80,
    "remark": "参画の備考"
  }'
```

### 7. 案件から社員を削除

```bash
curl -X DELETE "http://localhost:3000/api/projects/{project-id}/assignments/{assignment-id}" \
  -H "Authorization: Bearer $TOKEN"
```

## 社員詳細（参画履歴確認）

### 8. 社員の詳細取得（参画履歴を含む）

```bash
curl -X GET "http://localhost:3000/api/employees/{employee-id}" \
  -H "Authorization: Bearer $TOKEN"
```

## テストシナリオ例

### シナリオ1: 案件の新規作成から削除まで

```bash
# 1. 企業一覧を取得してIDを確認
curl -X GET "http://localhost:3000/api/companies" \
  -H "Authorization: Bearer $TOKEN"

# 2. 案件を作成
PROJECT_ID=$(curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "テストシナリオ案件",
    "contractType": "DISPATCH",
    "startDate": "2026-02-01"
  }' | jq -r '.id')

echo "Created project ID: $PROJECT_ID"

# 3. 作成した案件を取得
curl -X GET "http://localhost:3000/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"

# 4. 案件情報を更新
curl -X PATCH "http://localhost:3000/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "更新後の説明",
    "endDate": "2026-12-31"
  }'

# 5. 案件を削除
curl -X DELETE "http://localhost:3000/api/projects/$PROJECT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### シナリオ2: 社員を案件に参画させる

```bash
# 1. 社員一覧を取得
curl -X GET "http://localhost:3000/api/employees?limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 2. 案件一覧を取得
curl -X GET "http://localhost:3000/api/projects?limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 3. 社員を案件に追加
ASSIGNMENT_ID=$(curl -X POST "http://localhost:3000/api/projects/{project-id}/assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "{employee-id}",
    "startDate": "2026-02-01",
    "role": "開発担当",
    "workload": 100
  }' | jq -r '.id')

echo "Created assignment ID: $ASSIGNMENT_ID"

# 4. 案件詳細を取得（参画社員を含む）
curl -X GET "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $TOKEN"

# 5. 社員詳細を取得（参画履歴を含む）
curl -X GET "http://localhost:3000/api/employees/{employee-id}" \
  -H "Authorization: Bearer $TOKEN"

# 6. 参画情報を削除
curl -X DELETE "http://localhost:3000/api/projects/{project-id}/assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## バリデーションテスト

### 必須項目のテスト

```bash
# 案件名なしでエラー
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "contractType": "DISPATCH"
  }'
# 期待: 400 Bad Request

# 企業IDなしでエラー
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テスト案件",
    "contractType": "DISPATCH"
  }'
# 期待: 400 Bad Request

# 契約形態なしでエラー
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "テスト案件"
  }'
# 期待: 400 Bad Request
```

### 無効な値のテスト

```bash
# 無効なステータス
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "テスト案件",
    "contractType": "DISPATCH",
    "status": "INVALID_STATUS"
  }'
# 期待: 400 Bad Request

# 無効な契約形態
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "テスト案件",
    "contractType": "INVALID_TYPE"
  }'
# 期待: 400 Bad Request

# 稼働率が範囲外
curl -X POST "http://localhost:3000/api/projects/{project-id}/assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "{employee-id}",
    "startDate": "2026-02-01",
    "workload": 150
  }'
# 期待: 400 Bad Request（0-100の範囲外）
```

## 権限テスト

### VIEWER権限でのテスト

```bash
# VIEWERトークンで案件作成を試行
curl -X POST "http://localhost:3000/api/projects" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "{company-id}",
    "name": "テスト案件",
    "contractType": "DISPATCH"
  }'
# 期待: 403 Forbidden

# VIEWERトークンで案件更新を試行
curl -X PATCH "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新後の名前"
  }'
# 期待: 403 Forbidden

# VIEWERトークンで案件削除を試行
curl -X DELETE "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
# 期待: 403 Forbidden

# VIEWERトークンで案件取得（これは成功するはず）
curl -X GET "http://localhost:3000/api/projects/{project-id}" \
  -H "Authorization: Bearer $VIEWER_TOKEN"
# 期待: 200 OK
```

## 期待される結果

### 正常系

| エンドポイント | メソッド | ステータスコード | レスポンス |
|---|---|---|---|
| /api/projects | GET | 200 | 案件一覧 + ページネーション |
| /api/projects/:id | GET | 200 | 案件詳細（参画社員を含む） |
| /api/projects | POST | 201 | 作成された案件 |
| /api/projects/:id | PATCH | 200 | 更新された案件 |
| /api/projects/:id | DELETE | 204 | レスポンスなし |
| /api/projects/:id/assignments | POST | 201 | 作成された参画情報 |
| /api/projects/:id/assignments/:aid | DELETE | 204 | レスポンスなし |

### 異常系

| シナリオ | ステータスコード | エラーメッセージ |
|---|---|---|
| 認証なし | 401 | Unauthorized |
| 権限不足（VIEWER） | 403 | Forbidden |
| 必須項目なし | 400 | バリデーションエラー |
| 存在しないID | 404 | Not Found |
| 無効な値 | 400 | バリデーションエラー |

## テスト結果記録

実施日: _______________

| テスト項目 | 結果 | 備考 |
|---|---|---|
| 案件一覧取得 | ⃣ | |
| 案件詳細取得 | ⃣ | |
| 案件作成 | ⃣ | |
| 案件更新 | ⃣ | |
| 案件削除 | ⃣ | |
| 社員追加 | ⃣ | |
| 社員削除 | ⃣ | |
| フィルタ検索 | ⃣ | |
| ページネーション | ⃣ | |
| バリデーション | ⃣ | |
| 権限制御 | ⃣ | |

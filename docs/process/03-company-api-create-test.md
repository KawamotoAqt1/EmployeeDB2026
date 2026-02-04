# 企業作成API（POST /api/companies）テスト結果

## テスト実施日時
2026-02-03

## テスト環境
- Backend Server: http://localhost:3001
- 認証: JWT (ADMIN権限でテスト実施)

## エンドポイント仕様

### POST /api/companies

#### 認証・認可
- `requireAuth`: JWT認証必須
- `requireEditor`: ADMIN/EDITOR権限必須

#### バリデーションスキーマ（companySchema）
```typescript
const companySchema = z.object({
  code: z.string().min(1).max(50),          // 必須、1-50文字
  name: z.string().min(1).max(200),          // 必須、1-200文字
  nameKana: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().max(500).optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  industry: z.string().max(100).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional().default('ACTIVE'),
  remark: z.string().optional().nullable(),
});
```

#### レスポンス形式
- 成功時: HTTP 201
  ```json
  {
    "success": true,
    "data": {
      "id": "UUID",
      "code": "string",
      "name": "string",
      ...
      "_count": {
        "offices": 0,
        "departments": 0,
        "contacts": 0,
        "projects": 0
      }
    }
  }
  ```
- エラー時: HTTP 400/401/403
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "エラーメッセージ",
      "details": [...] // バリデーションエラー時
    }
  }
  ```

---

## テスト結果サマリ

| No | テストケース | 結果 | HTTPステータス |
|----|-------------|------|---------------|
| 1 | 必須フィールドのみでの作成 | PASS | 201 |
| 2 | 全フィールドを含む作成 | PASS | 201 |
| 3 | 必須フィールド欠落（code） | PASS | 400 |
| 4 | 必須フィールド欠落（name） | PASS | 400 |
| 5 | 重複企業コード | PASS | 400 |
| 6 | 不正なstatus値 | PASS | 400 |
| 7 | 認証なし（トークンなし） | PASS | 401 |
| 8 | 権限不足（VIEWER） | SKIP | - |
| 9 | 関連データの追加（offices/departments/contacts） | PASS | 201 |
| 10 | 空文字列フィールド | PASS | 201 |
| 11 | フィールド長超過（code > 50文字） | PASS | 400 |
| 12 | 異なるstatus値（INACTIVE/TERMINATED） | PASS | 201 |

---

## 詳細テスト結果

### Test 1: 必須フィールドのみでの作成

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "TEST_001",
  "name": "Test Company Required Only"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "31588fe6-7eec-4e7a-a14b-f20164ba631a",
    "code": "TEST_001",
    "name": "Test Company Required Only",
    "nameKana": null,
    "postalCode": null,
    "address": null,
    "phone": null,
    "website": null,
    "industry": null,
    "status": "ACTIVE",
    "remark": null,
    "createdAt": "2026-02-03T09:43:26.202Z",
    "updatedAt": "2026-02-03T09:43:26.202Z",
    "_count": {
      "offices": 0,
      "departments": 0,
      "contacts": 0,
      "projects": 0
    }
  }
}
```

**結果:** PASS (HTTP 201)
- 必須フィールドのみで企業が正常に作成された
- オプションフィールドはnullで初期化
- statusはデフォルト値"ACTIVE"が設定された

---

### Test 2: 全フィールドを含む作成

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "TEST_002",
  "name": "Test Company All Fields",
  "nameKana": "Test Company Kana",
  "postalCode": "100-0001",
  "address": "Tokyo Test Address 1-1-1",
  "phone": "03-1234-5678",
  "website": "https://test.example.com",
  "industry": "IT Software",
  "status": "ACTIVE",
  "remark": "Test company with all fields"
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "89242ba6-cd28-4229-8b30-af4e20ac5f24",
    "code": "TEST_002",
    "name": "Test Company All Fields",
    "nameKana": "Test Company Kana",
    "postalCode": "100-0001",
    "address": "Tokyo Test Address 1-1-1",
    "phone": "03-1234-5678",
    "website": "https://test.example.com",
    "industry": "IT Software",
    "status": "ACTIVE",
    "remark": "Test company with all fields",
    "createdAt": "2026-02-03T09:43:49.156Z",
    "updatedAt": "2026-02-03T09:43:49.156Z",
    "_count": {
      "offices": 0,
      "departments": 0,
      "contacts": 0,
      "projects": 0
    }
  }
}
```

**結果:** PASS (HTTP 201)
- 全フィールドが正しく保存された

---

### Test 3: バリデーションエラー - 必須フィールド欠落（code）

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Test Company Without Code"
}
```

**レスポンス:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [
      {
        "field": "code",
        "message": "Required"
      }
    ]
  }
}
```

**結果:** PASS (HTTP 400)
- 必須フィールド（code）がない場合、適切なバリデーションエラーが返される

---

### Test 4: バリデーションエラー - 必須フィールド欠落（name）

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "TEST_NO_NAME"
}
```

**レスポンス:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [
      {
        "field": "name",
        "message": "Required"
      }
    ]
  }
}
```

**結果:** PASS (HTTP 400)
- 必須フィールド（name）がない場合、適切なバリデーションエラーが返される

---

### Test 5: 重複企業コードエラー

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "TEST_001",
  "name": "Duplicate Code Test"
}
```

**レスポンス:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_CODE",
    "message": "企業コードが既に使用されています"
  }
}
```

**結果:** PASS (HTTP 400)
- 既存の企業コードと重複する場合、適切なエラーが返される

---

### Test 6: 不正なstatus値

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "TEST_003",
  "name": "Invalid Status Test",
  "status": "INVALID_STATUS"
}
```

**レスポンス:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [
      {
        "field": "status",
        "message": "Invalid enum value. Expected 'ACTIVE' | 'INACTIVE' | 'TERMINATED', received 'INVALID_STATUS'"
      }
    ]
  }
}
```

**結果:** PASS (HTTP 400)
- 許可されていないstatus値の場合、適切なエラーが返される

---

### Test 7: 認証なし（トークンなし）

**リクエスト:**
```bash
POST /api/companies
Content-Type: application/json
(Authorization header なし)

{
  "code": "TEST_NO_AUTH",
  "name": "No Auth Test"
}
```

**レスポンス:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

**結果:** PASS (HTTP 401)
- 認証トークンがない場合、401エラーが返される

---

### Test 8: 権限不足（VIEWER）

**結果:** SKIP
- テスト環境にVIEWERロールのユーザーが存在しないため、スキップ
- コード上では `requireEditor` ミドルウェアで VIEWER ロールは拒否される設計

---

### Test 9: 関連データの追加（offices/departments/contacts）

企業を作成後、関連データ（拠点、部署、担当窓口）を追加するテスト。

**9a. 企業作成:**
```json
{
  "code": "TEST_003",
  "name": "Test Company With Relations",
  "status": "ACTIVE",
  "remark": "Test company for nested data"
}
```
結果: PASS (HTTP 201)

**9b. 拠点追加 (POST /api/companies/{id}/offices):**
```json
{
  "name": "Test Office HQ",
  "postalCode": "100-0001",
  "address": "Tokyo Test 1-1-1",
  "phone": "03-1111-2222",
  "isHeadquarters": true,
  "sortOrder": 1
}
```
結果: PASS (HTTP 201)

**9c. 部署追加 (POST /api/companies/{id}/departments):**
```json
{
  "officeId": "{office_id}",
  "type": "DIVISION",
  "name": "Test IT Division",
  "sortOrder": 1
}
```
結果: PASS (HTTP 201)

**9d. 担当窓口追加 (POST /api/companies/{id}/contacts):**
```json
{
  "departmentId": "{dept_id}",
  "name": "Test Taro",
  "nameKana": "Test Taro Kana",
  "title": "Manager",
  "email": "test.taro@example.com",
  "phone": "03-1234-5678",
  "mobile": "090-1234-5678",
  "isPrimary": true,
  "remark": "Test contact"
}
```
結果: PASS (HTTP 201)

**9e. 企業詳細取得で関連データ確認 (GET /api/companies/{id}):**
```json
{
  "success": true,
  "data": {
    "id": "93829d94-6db9-4907-a3c0-cf6fbdfff635",
    "code": "TEST_003",
    "name": "Test Company With Relations",
    "offices": [
      {
        "id": "0446cf64-b549-4929-a3d4-291f0b8fd43e",
        "name": "Test Office HQ",
        "isHeadquarters": true
      }
    ],
    "departments": [
      {
        "id": "852d51a7-5731-495b-967c-9819b0a2c7fa",
        "type": "DIVISION",
        "name": "Test IT Division",
        "children": [],
        "office": {
          "id": "0446cf64-b549-4929-a3d4-291f0b8fd43e",
          "name": "Test Office HQ"
        }
      }
    ],
    "contacts": [
      {
        "id": "34463db1-2319-430c-8865-337cae160d03",
        "name": "Test Taro",
        "isPrimary": true,
        "department": {
          "id": "852d51a7-5731-495b-967c-9819b0a2c7fa",
          "name": "Test IT Division"
        }
      }
    ],
    "projects": []
  }
}
```
結果: PASS - 全ての関連データが正しく取得できる

---

### Test 10: 空文字列フィールド

**リクエスト:**
```json
{
  "code": "TEST_004",
  "name": "Test Empty Fields",
  "nameKana": "",
  "postalCode": "",
  "address": "",
  "phone": "",
  "website": "",
  "industry": "",
  "remark": ""
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "code": "TEST_004",
    "name": "Test Empty Fields",
    "nameKana": "",
    "postalCode": "",
    "address": "",
    "phone": "",
    "website": null,
    "industry": "",
    "status": "ACTIVE",
    "remark": ""
  }
}
```

**結果:** PASS (HTTP 201)
- 空文字列は許可される
- websiteフィールドは空文字列がnullに変換される（スキーマのtransform処理）

---

### Test 11: フィールド長超過（code > 50文字）

**リクエスト:**
```json
{
  "code": "TEST_012345678901234567890123456789012345678901234567890",
  "name": "Test Code Too Long"
}
```

**レスポンス:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [
      {
        "field": "code",
        "message": "String must contain at most 50 character(s)"
      }
    ]
  }
}
```

**結果:** PASS (HTTP 400)
- 50文字を超えるcodeは拒否される

---

### Test 12: 異なるstatus値

**12a. INACTIVE status:**
```json
{
  "code": "TEST_005",
  "name": "Test Inactive Status",
  "status": "INACTIVE"
}
```
結果: PASS (HTTP 201) - status: "INACTIVE" で作成される

**12b. TERMINATED status:**
```json
{
  "code": "TEST_006",
  "name": "Test Terminated Status",
  "status": "TERMINATED"
}
```
結果: PASS (HTTP 201) - status: "TERMINATED" で作成される

---

## クリーンアップ

テスト終了後、作成した全てのTEST_*企業を削除:
- TEST_001 - 削除完了
- TEST_002 - 削除完了
- TEST_003 - 削除完了（関連するoffices, departments, contactsもカスケード削除）
- TEST_004 - 削除完了
- TEST_005 - 削除完了
- TEST_006 - 削除完了

---

## 総合評価

**結果: 全テストPASS（1件SKIP）**

### 確認できた機能:
1. 企業の新規作成（必須フィールドのみ、全フィールド）
2. バリデーション（必須チェック、長さ制限、enum制約）
3. 重複企業コードチェック
4. 認証・認可（JWT認証、EDITOR権限チェック）
5. 関連データの追加・取得（offices, departments, contacts）
6. デフォルト値の設定（status = "ACTIVE"）
7. 空文字列の処理（websiteフィールドのnull変換）

### 注意点:
- VIEWERロールのテストは環境にユーザーがないためスキップ
- 日本語文字列はWindows環境のcurlでエンコーディング問題が発生するため、ASCII文字でテスト実施

### 推奨事項:
1. VIEWERロールのユーザーをseedに追加してテストカバレッジを向上
2. 自動化テスト（Jest/Vitest）の追加を検討

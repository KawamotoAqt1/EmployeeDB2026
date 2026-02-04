# 案件更新API（PUT /api/projects/:id）テスト結果

## 実施日時
2026-02-03

## エンドポイント仕様

### URL
`PUT /api/projects/:id`

### 認証・認可
- 認証必須（`requireAuth`）
- 編集権限必須（`requireEditor` - ADMIN/EDITORのみ）

### リクエストボディ（projectUpdateSchema）
```typescript
const projectUpdateSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  name: z.string().min(1, '案件名は必須です').max(200).optional(),
  description: z.string().optional().nullable(),
  companyId: z.string().uuid('有効な企業IDを指定してください').optional(),
  departmentId: z.string().uuid().optional().nullable(),
  contractType: z.enum(['DISPATCH', 'SES', 'CONTRACT']).optional(),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  unitPrice: z.number().optional().nullable(),
  status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
  location: z.string().max(200).optional().nullable(),
  remark: z.string().optional().nullable(),
});
```

### レスポンス
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "companyId": "uuid",
    "departmentId": "uuid | null",
    "code": "string",
    "name": "string",
    "description": "string | null",
    "contractType": "DISPATCH | SES | CONTRACT",
    "contractStartDate": "ISO8601 | null",
    "contractEndDate": "ISO8601 | null",
    "deliveryDate": "ISO8601 | null",
    "budget": "number | null",
    "unitPrice": "number | null",
    "status": "PROPOSAL | IN_PROGRESS | COMPLETED | CANCELLED | ON_HOLD",
    "location": "string | null",
    "remark": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "company": { ... },
    "department": { ... },
    "assignments": [ ... ]
  }
}
```

---

## テスト結果

### 1. 基本フィールド更新テスト

#### Test 1: 基本フィールドの更新（name, description, location）
**リクエスト:**
```json
{
  "name": "Updated Test Project",
  "description": "Updated description",
  "location": "Osaka"
}
```
**結果:** 成功
- name: "Updated Test Project" に更新
- description: "Updated description" に更新
- location: "Osaka" に更新
- updatedAt が更新時刻に変更

---

### 2. ステータス変更テスト

#### Test 2: PROPOSAL -> IN_PROGRESS
**リクエスト:**
```json
{"status": "IN_PROGRESS"}
```
**結果:** 成功
- status が "IN_PROGRESS" に変更

#### Test 3: IN_PROGRESS -> COMPLETED
**リクエスト:**
```json
{"status": "COMPLETED"}
```
**結果:** 成功
- status が "COMPLETED" に変更

#### Test 4: COMPLETED -> ON_HOLD
**リクエスト:**
```json
{"status": "ON_HOLD"}
```
**結果:** 成功
- status が "ON_HOLD" に変更

#### Test 5: ON_HOLD -> CANCELLED
**リクエスト:**
```json
{"status": "CANCELLED"}
```
**結果:** 成功
- status が "CANCELLED" に変更

**ステータス変更の制約:** なし（任意のステータスから任意のステータスへ変更可能）

---

### 3. 契約形態変更テスト

#### Test 6: CONTRACT -> DISPATCH
**リクエスト:**
```json
{"contractType": "DISPATCH"}
```
**結果:** 成功
- contractType が "DISPATCH" に変更

#### Test 7: DISPATCH -> SES
**リクエスト:**
```json
{"contractType": "SES"}
```
**結果:** 成功
- contractType が "SES" に変更

---

### 4. 契約期間変更テスト

#### Test 8: 契約期間の変更
**リクエスト:**
```json
{
  "contractStartDate": "2025-05-01",
  "contractEndDate": "2025-12-31"
}
```
**結果:** 成功
- contractStartDate: "2025-05-01T00:00:00.000Z"
- contractEndDate: "2025-12-31T00:00:00.000Z"

#### Test 9: 納品日の設定
**リクエスト:**
```json
{"deliveryDate": "2025-11-30"}
```
**結果:** 成功
- deliveryDate: "2025-11-30T00:00:00.000Z"

---

### 5. 企業ID変更テスト

#### Test 10: companyId の変更
**リクエスト:**
```json
{"companyId": "acfc5cec-99cc-4614-a652-cf433677c7fc"}
```
**結果:** 成功
- companyId が新しい企業IDに変更
- company オブジェクトも新しい企業情報に更新

---

### 6. 数値フィールド更新テスト

#### Test 11: budget, unitPrice の更新
**リクエスト:**
```json
{
  "budget": 50000000,
  "unitPrice": 1000000
}
```
**結果:** 成功
- budget: "50000000"（文字列として返される）
- unitPrice: "1000000"（文字列として返される）

---

### 7. Null設定テスト

#### Test 12: フィールドをnullに設定
**リクエスト:**
```json
{
  "description": null,
  "deliveryDate": null,
  "remark": null
}
```
**結果:** 成功
- description: null
- deliveryDate: null
- remark: null

---

### 8. 複数フィールド同時更新テスト

#### Test 13: 複数フィールドの同時更新
**リクエスト:**
```json
{
  "name": "Multi-field Update Test",
  "description": "Testing multiple field update",
  "status": "PROPOSAL",
  "contractType": "CONTRACT",
  "contractStartDate": "2026-01-01",
  "contractEndDate": "2026-12-31",
  "budget": 100000000,
  "unitPrice": 900000,
  "location": "Remote",
  "remark": "Test remark"
}
```
**結果:** 成功
- すべてのフィールドが正しく更新

---

## エラーケーステスト

### Error Test 1: 無効なステータス値
**リクエスト:**
```json
{"status": "INVALID_STATUS"}
```
**結果:** 400 VALIDATION_ERROR
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{
      "field": "status",
      "message": "Invalid enum value. Expected 'PROPOSAL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD', received 'INVALID_STATUS'"
    }]
  }
}
```

### Error Test 2: 無効な契約形態
**リクエスト:**
```json
{"contractType": "INVALID_TYPE"}
```
**結果:** 400 VALIDATION_ERROR
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{
      "field": "contractType",
      "message": "Invalid enum value. Expected 'DISPATCH' | 'SES' | 'CONTRACT', received 'INVALID_TYPE'"
    }]
  }
}
```

### Error Test 3: 存在しない企業ID
**リクエスト:**
```json
{"companyId": "00000000-0000-0000-0000-000000000000"}
```
**結果:** 400 BAD_REQUEST
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "指定された企業が見つかりません"
  }
}
```

### Error Test 4: 存在しない案件ID
**URL:** `PUT /api/projects/00000000-0000-0000-0000-000000000000`
**結果:** 404 NOT_FOUND
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "案件が見つかりません"
  }
}
```

### Error Test 5: 無効なUUIDフォーマット
**URL:** `PUT /api/projects/invalid-uuid`
**結果:** 500 DATABASE_ERROR
```json
{
  "success": false,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "データベースエラーが発生しました"
  }
}
```

### Error Test 6: 認証なし
**リクエスト:** Authorization ヘッダーなし
**結果:** 401 UNAUTHORIZED
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

### Error Test 7: 空の案件名
**リクエスト:**
```json
{"name": ""}
```
**結果:** 400 VALIDATION_ERROR
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{
      "field": "name",
      "message": "案件名は必須です"
    }]
  }
}
```

### Error Test 8: 無効な企業IDフォーマット
**リクエスト:**
```json
{"companyId": "not-a-uuid"}
```
**結果:** 400 VALIDATION_ERROR
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "details": [{
      "field": "companyId",
      "message": "有効な企業IDを指定してください"
    }]
  }
}
```

---

## コードレビュー結果

### 問題点

#### 1. 契約期間の妥当性チェックが欠落（重要度: 高）
**場所:** `backend/src/routes/projects.ts` 302-369行目

**問題:** POST（作成）エンドポイントでは `contractStartDate > contractEndDate` のチェックが実装されているが、PUT（更新）エンドポイントでは同様のチェックが実装されていない。

**影響:** 契約終了日が契約開始日より前の不整合なデータを設定可能。

**推奨修正:**
```typescript
// PUT エンドポイントに追加すべきバリデーション
if (data.contractStartDate && data.contractEndDate) {
  const startDate = new Date(data.contractStartDate);
  const endDate = new Date(data.contractEndDate);
  if (startDate > endDate) {
    throw new AppError('BAD_REQUEST', '契約終了日は契約開始日以降である必要があります', 400);
  }
}
// 既存の開始日/終了日と組み合わせたチェックも必要
if (data.contractStartDate && existing.contractEndDate && !data.contractEndDate) {
  const startDate = new Date(data.contractStartDate);
  if (startDate > existing.contractEndDate) {
    throw new AppError('BAD_REQUEST', '契約開始日は契約終了日以前である必要があります', 400);
  }
}
```

#### 2. 部署の存在確認が欠落（重要度: 中）
**場所:** `backend/src/routes/projects.ts` 302-369行目

**問題:** `companyId` の存在確認は実装されているが、`departmentId` の存在確認が実装されていない。

**影響:** 存在しない部署IDを指定した場合、Prismaのエラーが発生し、ユーザーに適切なエラーメッセージが表示されない。

**推奨修正:**
```typescript
// 部署の存在確認（変更する場合）
if (data.departmentId) {
  const department = await prisma.companyDepartment.findUnique({
    where: { id: data.departmentId },
  });
  if (!department) {
    throw new AppError('BAD_REQUEST', '指定された部署が見つかりません', 400);
  }
  // オプション: 企業との整合性チェック
  const targetCompanyId = data.companyId || existing.companyId;
  if (department.companyId !== targetCompanyId) {
    throw new AppError('BAD_REQUEST', '部署は指定された企業に属している必要があります', 400);
  }
}
```

#### 3. 無効なUUID形式のエラーハンドリング（重要度: 低）
**場所:** `backend/src/routes/projects.ts` 302-369行目

**問題:** パスパラメータ `:id` に無効なUUID形式が渡された場合、`DATABASE_ERROR` という汎用エラーが返される。

**影響:** ユーザーに対して問題の原因が不明確。

**推奨修正:**
```typescript
// パスパラメータのバリデーションを追加
const idSchema = z.string().uuid('有効な案件IDを指定してください');
try {
  idSchema.parse(id);
} catch {
  throw new AppError('BAD_REQUEST', '有効な案件IDを指定してください', 400);
}
```

#### 4. 企業変更時の部署整合性チェックが欠落（重要度: 中）
**問題:** `companyId` を変更した場合、既存の `departmentId` との整合性がチェックされていない。

**影響:** 企業Aの部署が設定されている案件の企業を企業Bに変更した場合、部署は企業Aに属したままになる可能性がある。

**推奨修正:**
```typescript
// companyId変更時に部署との整合性チェック
if (data.companyId && existing.departmentId && !data.departmentId) {
  const existingDept = await prisma.companyDepartment.findUnique({
    where: { id: existing.departmentId }
  });
  if (existingDept && existingDept.companyId !== data.companyId) {
    // 部署をnullにクリアするか、エラーを返す
    updateData.department = { disconnect: true };
    // または
    // throw new AppError('BAD_REQUEST', '企業変更時は部署もリセットしてください', 400);
  }
}
```

### 良い点

1. **適切な認証・認可チェック:** `requireAuth` と `requireEditor` ミドルウェアが正しく適用されている。

2. **企業存在確認の実装:** `companyId` 変更時に企業の存在確認を行っている。

3. **部分更新のサポート:** `undefined` チェックにより、指定されたフィールドのみを更新する実装になっている。

4. **Null値のサポート:** nullable フィールドに対して `null` を設定可能。

5. **レスポンスの充実:** 更新後のデータに `company`, `department`, `assignments` を含めて返却している。

6. **Zodによるバリデーション:** 入力値のバリデーションが適切に実装されている。

---

## テスト結果サマリー

| テスト項目 | 結果 | 備考 |
|-----------|------|------|
| 基本フィールド更新 | 成功 | name, description, location |
| ステータス変更（全パターン） | 成功 | PROPOSAL/IN_PROGRESS/COMPLETED/ON_HOLD/CANCELLED |
| 契約形態変更 | 成功 | CONTRACT/DISPATCH/SES |
| 契約期間変更 | 成功 | contractStartDate, contractEndDate, deliveryDate |
| 企業ID変更 | 成功 | companyId |
| 数値フィールド更新 | 成功 | budget, unitPrice |
| Null設定 | 成功 | nullable フィールド |
| 複数フィールド同時更新 | 成功 | 10フィールド同時更新 |
| 無効なステータス値 | 正常にエラー | VALIDATION_ERROR |
| 無効な契約形態 | 正常にエラー | VALIDATION_ERROR |
| 存在しない企業ID | 正常にエラー | BAD_REQUEST |
| 存在しない案件ID | 正常にエラー | NOT_FOUND |
| 無効なUUID形式 | エラー | DATABASE_ERROR（改善推奨） |
| 認証なし | 正常にエラー | UNAUTHORIZED |
| 空の案件名 | 正常にエラー | VALIDATION_ERROR |

---

## 結論

案件更新API（PUT /api/projects/:id）は基本的な機能は正常に動作している。ただし、以下の改善が推奨される：

1. **必須改善:** 契約期間の妥当性チェックを追加
2. **推奨改善:** 部署IDの存在確認を追加
3. **推奨改善:** 企業変更時の部署整合性チェックを追加
4. **軽微改善:** 無効なUUID形式に対する適切なエラーメッセージ

全体的に、認証・認可、バリデーション、エラーハンドリングは適切に実装されており、実用に耐えうる品質である。

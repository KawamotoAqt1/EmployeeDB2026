# 企業更新API（PUT /api/companies/:id）テスト結果

## テスト実施日
2026-02-03

## 1. エンドポイント仕様確認

### PUT /api/companies/:id

**ファイル**: `backend/src/routes/companies.ts` (246-289行)

**認可**: `requireAuth` + `requireEditor` (ADMIN/EDITOR権限必要)

**バリデーションスキーマ** (companySchema.partial()):
```typescript
const companySchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
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

**処理フロー**:
1. IDで企業の存在確認
2. 企業コード変更時は重複チェック
3. `prisma.company.update()` で更新
4. `_count` 付きで結果を返却

---

## 2. テスト結果

### 2.1 基本フィールドの更新

| テスト項目 | リクエスト | 結果 | 備考 |
|-----------|-----------|------|------|
| 電話番号更新 | `{"phone": "06-9999-8888"}` | OK | 正常に更新 |
| 備考更新 | `{"remark": "更新テスト"}` | OK | 正常に更新 |
| 業種更新 | `{"industry": "製造業・自動車部品"}` | OK | 正常に更新 |

### 2.2 ステータス変更

| テスト項目 | リクエスト | 結果 | 備考 |
|-----------|-----------|------|------|
| ACTIVE -> INACTIVE | `{"status": "INACTIVE"}` | OK | 正常に変更 |
| INACTIVE -> ACTIVE | `{"status": "ACTIVE"}` | OK | 正常に変更 |
| 無効なステータス | `{"status": "INVALID"}` | NG (400) | バリデーションエラー正常 |

### 2.3 ネストされたオブジェクト（offices, contacts）

| テスト項目 | エンドポイント | 結果 | 備考 |
|-----------|---------------|------|------|
| 拠点追加 | POST /api/companies/:id/offices | OK | 別エンドポイントで対応 |
| 拠点更新 | PUT /api/companies/:id/offices/:officeId | OK | 正常に更新 |
| 拠点削除 | DELETE /api/companies/:id/offices/:officeId | OK | 正常に削除 |
| 担当窓口更新 | PUT /api/companies/:id/contacts/:contactId | OK | 正常に更新 |

**注意**: PUT /api/companies/:id はCompanyテーブルの直接フィールドのみ更新可能。
ネストされたoffices/contacts配列を渡しても**無視される**（エラーにはならない）。

### 2.4 部分更新

| テスト項目 | リクエスト | 結果 | 備考 |
|-----------|-----------|------|------|
| 単一フィールド | `{"industry": "..."}` | OK | 他フィールドは維持 |
| 複数フィールド | `{"phone": "...", "remark": "..."}` | OK | 指定フィールドのみ更新 |

### 2.5 エラーケース

| テスト項目 | 結果 | エラーコード | メッセージ |
|-----------|------|-------------|-----------|
| 存在しない企業 | 404 | NOT_FOUND | 企業が見つかりません |
| 企業コード重複 | 400 | DUPLICATE_CODE | 企業コードが既に使用されています |
| 無効なステータス | 400 | VALIDATION_ERROR | Invalid enum value... |
| 認証なし | 401 | UNAUTHORIZED | 認証が必要です |

---

## 3. コードレビュー：問題点と改善提案

### 3.1 発見された問題点

#### [CRITICAL] 文字エンコーディング問題
- **現象**: APIレスポンスで日本語文字列が文字化け（`�X�V�e�X�g`）
- **原因の可能性**:
  - curlコマンド実行時のシェル環境（Windows Git Bash）のエンコーディング
  - データベース接続時のエンコーディング設定
- **影響**: ログ確認時に可読性が低下
- **備考**: データベース内部では正しくUTF-8で保存されている可能性が高い（GETで取得したデータは正常）

#### [HIGH] ネストオブジェクト更新の仕様不明確
- **現象**: PUT /api/companies/:id に `offices` 配列を含めても無視される
- **期待動作**:
  - オプション1: エラーを返す（不正なプロパティ）
  - オプション2: ネストされたデータも一括更新する
- **現状**: 静かに無視される（`companySchema.partial().parse()` で不明なキーは除外）
- **改善提案**:
  ```typescript
  const companySchema = z.object({...}).strict(); // 不明なキーでエラー
  ```
  または、ドキュメントで明確に仕様を記載

#### [MEDIUM] 楽観的ロック未実装
- **現象**: 同時更新時にデータが上書きされる可能性
- **リスク**: 2人のユーザーが同時に同じ企業を編集した場合、後から更新した方のデータで上書き
- **改善提案**: `updatedAt` を使用した楽観的ロック
  ```typescript
  // リクエストで updatedAt を受け取り、DBの値と比較
  if (existing.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
    throw new AppError('CONFLICT', '他のユーザーが更新しました', 409);
  }
  ```

#### [MEDIUM] レスポンスに関連データが含まれない
- **現象**: 更新後のレスポンスに `_count` のみで、`offices`/`contacts`/`departments` の詳細がない
- **影響**: フロントエンドで更新後に再度GETが必要
- **改善提案**: 更新時も `include` でフル関連データを返すオプションを提供

### 3.2 軽微な問題点

#### [LOW] トランザクション未使用
- 単一テーブル更新のため現状問題ないが、将来的に関連データも更新する場合はトランザクション必要

#### [LOW] 監査ログ未実装
- 誰がいつ何を更新したかのログが残らない
- 重要なビジネスデータなので監査証跡があると望ましい

### 3.3 良い実装点

- `companySchema.partial()` で部分更新を柔軟にサポート
- 企業コード重複チェックが適切（自分自身は除外）
- エラーハンドリングが一貫している
- 認可チェック（requireEditor）が適切に設定されている

---

## 4. 単体テスト結果

### Jest テスト実行結果

```
Test Suites: 1 failed, 1 total
Tests:       16 failed, 9 passed, 25 total
```

### 失敗したテストの原因分析

多くのテスト失敗は**モックの設定問題**が原因:
- `mockPrisma.company.findUnique` が正しく設定されていないケース
- `mockPrisma.companyContact.findFirst` が `findUnique` の代わりに使用されているが、テストでは `findUnique` をモック

**具体例**:
```typescript
// companies.ts (実際のコード)
const existing = await prisma.companyContact.findFirst({
  where: { id, companyId },
});

// companies.test.ts (テストコード) - 不一致!
mockPrisma.companyContact.findUnique.mockResolvedValue(testContacts.contact1);
```

### 修正が必要なテストケース

1. GET /api/companies/:id - モック設定漏れ
2. PUT /api/companies/:id - 一部モック設定漏れ
3. 子リソース系（offices, departments, contacts）- `findFirst` vs `findUnique` の不一致

---

## 5. 結論

### 動作確認結果: PASS

PUT /api/companies/:id APIは基本的な機能（基本フィールド更新、ステータス変更、部分更新、バリデーション、認可）が正常に動作している。

### 推奨アクション

1. **高優先度**: 単体テストのモック設定を修正（`findFirst` と `findUnique` の整合性）
2. **中優先度**: ネストオブジェクト送信時の挙動を明確化（エラーにするかドキュメント化）
3. **中優先度**: 楽観的ロックの実装検討（同時編集対策）
4. **低優先度**: 監査ログ機能の追加検討

---

## 付録: テストで使用したcurlコマンド

```bash
# 基本フィールド更新
curl -X PUT "http://localhost:3001/api/companies/{id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"phone": "06-9999-8888", "remark": "テスト"}'

# ステータス変更
curl -X PUT "http://localhost:3001/api/companies/{id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "INACTIVE"}'

# 拠点更新（サブリソース）
curl -X PUT "http://localhost:3001/api/companies/{id}/offices/{officeId}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "新拠点名", "phone": "06-1111-2222"}'
```

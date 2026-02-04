# 案件(Project)フィールド分析とテストケース

## 1. 全入力フィールド一覧

### 1.1 案件(Project)フィールド

| # | フィールド名 | 型 | 必須/任意 | Zodバリデーション | Prisma定義 | フロントエンド |
|---|-------------|------|----------|------------------|------------|---------------|
| 1 | code | string | 必須 | min(1), max(50) | VARCHAR(50), unique | テキスト入力 |
| 2 | name | string | 必須 | min(1), max(200), エラーメッセージ「案件名は必須です」 | VARCHAR(200) | テキスト入力 |
| 3 | description | string | 任意 | nullable() | Text | テキストエリア |
| 4 | companyId | string | 必須 | uuid(), エラーメッセージ「有効な企業IDを指定してください」 | UUID, FK | ドロップダウン |
| 5 | departmentId | string | 任意 | uuid(), nullable() | UUID, FK, nullable | ドロップダウン(企業選択後表示) |
| 6 | contractType | enum | 必須 | 'DISPATCH' \| 'SES' \| 'CONTRACT' | Enum ContractTypeProject | ドロップダウン |
| 7 | contractStartDate | string | 任意 | nullable() | Date, nullable | 日付入力 |
| 8 | contractEndDate | string | 任意 | nullable() | Date, nullable | 日付入力 |
| 9 | deliveryDate | string | 任意 | nullable() | Date, nullable | **未実装** |
| 10 | budget | number | 任意 | nullable() | Decimal(15,2), nullable | **未実装** |
| 11 | unitPrice | number | 任意 | nullable() | Decimal(15,2), nullable | **未実装** |
| 12 | status | enum | 任意 | 'PROPOSAL' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED' \| 'ON_HOLD', default 'PROPOSAL' | Enum ProjectStatus, default PROPOSAL | ドロップダウン |
| 13 | location | string | 任意 | max(200), nullable() | VARCHAR(200), nullable | **未実装** |
| 14 | remark | string | 任意 | nullable() | Text, nullable | テキストエリア |

### 1.2 案件参画(ProjectAssignment)フィールド

| # | フィールド名 | 型 | 必須/任意 | Zodバリデーション | Prisma定義 |
|---|-------------|------|----------|------------------|------------|
| 1 | employeeId | string | 必須 | uuid(), エラーメッセージ「有効な社員IDを指定してください」 | UUID, FK |
| 2 | role | string | 任意 | max(100), nullable() | VARCHAR(100), nullable |
| 3 | assignmentStartDate | string | 必須 | 必須(string) | Date |
| 4 | assignmentEndDate | string | 任意 | nullable() | Date, nullable |
| 5 | workloadPercentage | number | 任意 | int(), min(0), max(100), nullable() | Int, nullable |
| 6 | unitPrice | number | 任意 | nullable() | Decimal(15,2), nullable |
| 7 | billingType | enum | 任意 | 'HOURLY' \| 'DAILY' \| 'MONTHLY' \| 'FIXED', nullable() | Enum BillingType, nullable |
| 8 | status | enum | 任意 | 'SCHEDULED' \| 'IN_PROGRESS' \| 'COMPLETED', default 'SCHEDULED' | Enum AssignmentStatus, default SCHEDULED |
| 9 | remark | string | 任意 | nullable() | Text, nullable |

---

## 2. バックエンドとフロントエンドの整合性チェック結果

### 2.1 不整合箇所一覧

| # | 項目 | バックエンド(Zod/Prisma) | フロントエンド(types/form) | 状態 | 影響度 |
|---|-----|------------------------|--------------------------|------|-------|
| 1 | deliveryDate | あり(任意) | 型定義なし、フォームなし | **不整合** | 中 |
| 2 | budget | あり(任意) | 型定義なし、フォームなし | **不整合** | 中 |
| 3 | unitPrice | あり(任意) | 型定義なし、フォームなし | **不整合** | 中 |
| 4 | location | あり(任意) | 型定義なし、フォームなし | **不整合** | 低 |
| 5 | ProjectStatus値 | 'PROPOSAL' \| 'IN_PROGRESS' \| 'COMPLETED' \| 'CANCELLED' \| 'ON_HOLD' | 'ACTIVE' \| 'INACTIVE' \| 'COMPLETED' \| 'CANCELLED' | **重大な不整合** | 高 |
| 6 | CreateProjectRequest.code | バックエンドで必須 | 型定義にあり | 整合 | - |

### 2.2 型定義の詳細比較

#### フロントエンド CreateProjectRequest (types/index.ts)
```typescript
export interface CreateProjectRequest {
  code: string;
  companyId: string;
  departmentId?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;           // 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED'
  contractType: ContractTypeProject;
  contractStartDate?: string;
  contractEndDate?: string;
  remark?: string;
  // 不足: deliveryDate, budget, unitPrice, location
}
```

#### バックエンド projectSchema (routes/projects.ts)
```typescript
const projectSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1, '案件名は必須です').max(200),
  description: z.string().optional().nullable(),
  companyId: z.string().uuid('有効な企業IDを指定してください'),
  departmentId: z.string().uuid().optional().nullable(),
  contractType: z.enum(['DISPATCH', 'SES', 'CONTRACT']),
  contractStartDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),      // フロントエンドに未実装
  budget: z.number().optional().nullable(),             // フロントエンドに未実装
  unitPrice: z.number().optional().nullable(),          // フロントエンドに未実装
  status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional().default('PROPOSAL'),
  location: z.string().max(200).optional().nullable(), // フロントエンドに未実装
  remark: z.string().optional().nullable(),
});
```

### 2.3 ProjectStatus値の不整合(重大)

| 値 | バックエンド | フロントエンド型定義 | フロントエンドフォーム |
|----|------------|-------------------|---------------------|
| PROPOSAL | あり | **なし** | あり(選択肢として実装) |
| IN_PROGRESS | あり | **なし** | あり(選択肢として実装) |
| ON_HOLD | あり | **なし** | あり(選択肢として実装) |
| COMPLETED | あり | あり | あり |
| CANCELLED | あり | あり | あり |
| ACTIVE | **なし** | あり | **なし**(フォームでは使用していない) |
| INACTIVE | **なし** | あり | **なし**(フォームでは使用していない) |

**結論**: フロントエンドの `ProjectStatus` 型定義がバックエンドの実装と一致していない。ただし、フォーム(ProjectForm.tsx)では正しい値を直接使用している。

---

## 3. 各フィールドのテストケース

### 3.1 案件(Project)フィールドのテストケース

#### 3.1.1 code (案件コード)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 最小文字数 | "P" | 成功 |
| 2 | 正常系 | 最大文字数(50文字) | "P".repeat(50) | 成功 |
| 3 | 正常系 | 英数字混在 | "PRJ-2024-001" | 成功 |
| 4 | 正常系 | 日本語 | "案件001" | 成功 |
| 5 | 異常系 | 空文字 | "" | バリデーションエラー |
| 6 | 異常系 | 51文字以上 | "P".repeat(51) | バリデーションエラー |
| 7 | 異常系 | null | null | バリデーションエラー |
| 8 | 異常系 | 重複コード | 既存コード | ユニーク制約エラー |

#### 3.1.2 name (案件名)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 最小文字数 | "A" | 成功 |
| 2 | 正常系 | 最大文字数(200文字) | "案".repeat(200) | 成功 |
| 3 | 正常系 | 日本語名 | "基幹システム刷新プロジェクト" | 成功 |
| 4 | 異常系 | 空文字 | "" | バリデーションエラー(「案件名は必須です」) |
| 5 | 異常系 | 201文字以上 | "案".repeat(201) | バリデーションエラー |
| 6 | 異常系 | null | null | バリデーションエラー |

#### 3.1.3 description (案件説明)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 空 | undefined | 成功 |
| 2 | 正常系 | null | null | 成功 |
| 3 | 正常系 | 短い説明 | "テスト案件" | 成功 |
| 4 | 正常系 | 長い説明 | 1000文字以上のテキスト | 成功(Text型なので制限なし) |

#### 3.1.4 companyId (企業ID)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効なUUID | "550e8400-e29b-41d4-a716-446655440000" | 成功 |
| 2 | 異常系 | 空文字 | "" | バリデーションエラー |
| 3 | 異常系 | 無効なUUID形式 | "invalid-uuid" | バリデーションエラー(「有効な企業IDを指定してください」) |
| 4 | 異常系 | 存在しないUUID | 有効だが存在しないUUID | 「指定された企業が見つかりません」 |
| 5 | 異常系 | null | null | バリデーションエラー |

#### 3.1.5 departmentId (部署ID)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効なUUID | "550e8400-e29b-41d4-a716-446655440000" | 成功 |
| 2 | 正常系 | 空(未選択) | undefined | 成功 |
| 3 | 正常系 | null | null | 成功 |
| 4 | 異常系 | 無効なUUID形式 | "invalid-uuid" | バリデーションエラー |
| 5 | 異常系 | 存在しないUUID | 有効だが存在しないUUID | 「指定された部署が見つかりません」 |

#### 3.1.6 contractType (契約形態)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 派遣 | "DISPATCH" | 成功 |
| 2 | 正常系 | SES | "SES" | 成功 |
| 3 | 正常系 | 請負 | "CONTRACT" | 成功 |
| 4 | 異常系 | 空文字 | "" | バリデーションエラー |
| 5 | 異常系 | 無効な値 | "INVALID" | バリデーションエラー |
| 6 | 異常系 | 小文字 | "dispatch" | バリデーションエラー |
| 7 | 異常系 | null | null | バリデーションエラー |

#### 3.1.7 contractStartDate / contractEndDate (契約期間)

| # | カテゴリ | テストケース | 入力値(開始/終了) | 期待結果 |
|---|---------|------------|------------------|---------|
| 1 | 正常系 | 両方指定 | "2024-04-01" / "2025-03-31" | 成功 |
| 2 | 正常系 | 開始のみ | "2024-04-01" / null | 成功 |
| 3 | 正常系 | 終了のみ | null / "2025-03-31" | 成功 |
| 4 | 正常系 | 両方未指定 | null / null | 成功 |
| 5 | 正常系 | 同日 | "2024-04-01" / "2024-04-01" | 成功 |
| 6 | 異常系 | 開始>終了 | "2025-04-01" / "2024-03-31" | バリデーションエラー(「契約終了日は契約開始日以降である必要があります」) |
| 7 | 異常系 | 無効な日付形式 | "2024/04/01" / null | バリデーションエラー |
| 8 | 異常系 | 存在しない日付 | "2024-02-30" / null | バリデーションエラー |

#### 3.1.8 deliveryDate (納品日)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効な日付 | "2024-12-31" | 成功 |
| 2 | 正常系 | 未指定 | null | 成功 |
| 3 | 異常系 | 無効な日付形式 | "invalid" | バリデーションエラー |

#### 3.1.9 budget (予算)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 整数 | 1000000 | 成功 |
| 2 | 正常系 | 小数(2桁まで) | 1000000.50 | 成功 |
| 3 | 正常系 | 0 | 0 | 成功 |
| 4 | 正常系 | 未指定 | null | 成功 |
| 5 | 異常系 | 文字列 | "一千万" | バリデーションエラー |
| 6 | 異常系 | 負数 | -1000000 | 成功(バリデーションなし) |

#### 3.1.10 unitPrice (単価)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 整数 | 500000 | 成功 |
| 2 | 正常系 | 小数(2桁まで) | 500000.00 | 成功 |
| 3 | 正常系 | 未指定 | null | 成功 |
| 4 | 異常系 | 文字列 | "50万円" | バリデーションエラー |

#### 3.1.11 status (ステータス)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 提案中 | "PROPOSAL" | 成功 |
| 2 | 正常系 | 進行中 | "IN_PROGRESS" | 成功 |
| 3 | 正常系 | 完了 | "COMPLETED" | 成功 |
| 4 | 正常系 | 中止 | "CANCELLED" | 成功 |
| 5 | 正常系 | 保留 | "ON_HOLD" | 成功 |
| 6 | 正常系 | 未指定(デフォルト) | undefined | 成功(PROPOSAL) |
| 7 | 異常系 | 無効な値 | "ACTIVE" | バリデーションエラー |
| 8 | 異常系 | 小文字 | "proposal" | バリデーションエラー |

#### 3.1.12 location (勤務地)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効な値 | "東京都港区" | 成功 |
| 2 | 正常系 | 最大文字数(200文字) | "東".repeat(200) | 成功 |
| 3 | 正常系 | 未指定 | null | 成功 |
| 4 | 異常系 | 201文字以上 | "東".repeat(201) | バリデーションエラー |

#### 3.1.13 remark (備考)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効な値 | "特記事項なし" | 成功 |
| 2 | 正常系 | 長文 | 1000文字以上のテキスト | 成功 |
| 3 | 正常系 | 未指定 | null | 成功 |

---

### 3.2 案件参画(ProjectAssignment)フィールドのテストケース

#### 3.2.1 employeeId (社員ID)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効なUUID | "550e8400-e29b-41d4-a716-446655440000" | 成功 |
| 2 | 異常系 | 空文字 | "" | バリデーションエラー |
| 3 | 異常系 | 無効なUUID形式 | "invalid-uuid" | バリデーションエラー(「有効な社員IDを指定してください」) |
| 4 | 異常系 | 存在しないUUID | 有効だが存在しないUUID | 「指定された社員が見つかりません」 |

#### 3.2.2 role (役割)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効な値 | "プロジェクトマネージャー" | 成功 |
| 2 | 正常系 | 最大文字数(100文字) | "役".repeat(100) | 成功 |
| 3 | 正常系 | 未指定 | null | 成功 |
| 4 | 異常系 | 101文字以上 | "役".repeat(101) | バリデーションエラー |

#### 3.2.3 assignmentStartDate / assignmentEndDate (参画期間)

| # | カテゴリ | テストケース | 入力値(開始/終了) | 期待結果 |
|---|---------|------------|------------------|---------|
| 1 | 正常系 | 両方指定 | "2024-04-01" / "2024-09-30" | 成功 |
| 2 | 正常系 | 終了未定 | "2024-04-01" / null | 成功 |
| 3 | 異常系 | 開始未指定 | null / "2024-09-30" | バリデーションエラー(開始日は必須) |
| 4 | 異常系 | 開始>終了 | "2024-10-01" / "2024-09-30" | バリデーションエラー(「参画終了日は参画開始日以降である必要があります」) |
| 5 | 異常系 | 案件期間外(開始) | 案件開始日より前 | バリデーションエラー(「参画開始日は案件期間内である必要があります」) |
| 6 | 異常系 | 案件期間外(終了) | 案件終了日より後 | バリデーションエラー(「参画終了日は案件期間内である必要があります」) |

#### 3.2.4 workloadPercentage (稼働率)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 最小値 | 0 | 成功 |
| 2 | 正常系 | 最大値 | 100 | 成功 |
| 3 | 正常系 | 中間値 | 50 | 成功 |
| 4 | 正常系 | 未指定 | null | 成功 |
| 5 | 異常系 | 負数 | -1 | バリデーションエラー |
| 6 | 異常系 | 101以上 | 101 | バリデーションエラー |
| 7 | 異常系 | 小数 | 50.5 | バリデーションエラー(int指定) |

#### 3.2.5 unitPrice (単価)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 整数 | 500000 | 成功 |
| 2 | 正常系 | 小数 | 500000.50 | 成功 |
| 3 | 正常系 | 未指定 | null | 成功 |
| 4 | 異常系 | 文字列 | "50万円" | バリデーションエラー |

#### 3.2.6 billingType (請求形態)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 時給 | "HOURLY" | 成功 |
| 2 | 正常系 | 日給 | "DAILY" | 成功 |
| 3 | 正常系 | 月給 | "MONTHLY" | 成功 |
| 4 | 正常系 | 固定額 | "FIXED" | 成功 |
| 5 | 正常系 | 未指定 | null | 成功 |
| 6 | 異常系 | 無効な値 | "INVALID" | バリデーションエラー |

#### 3.2.7 status (参画ステータス)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 予定 | "SCHEDULED" | 成功 |
| 2 | 正常系 | 参画中 | "IN_PROGRESS" | 成功 |
| 3 | 正常系 | 終了 | "COMPLETED" | 成功 |
| 4 | 正常系 | 未指定(デフォルト) | undefined | 成功(SCHEDULED) |
| 5 | 異常系 | 無効な値 | "ACTIVE" | バリデーションエラー |

#### 3.2.8 remark (備考)

| # | カテゴリ | テストケース | 入力値 | 期待結果 |
|---|---------|------------|--------|---------|
| 1 | 正常系 | 有効な値 | "リモートワーク可" | 成功 |
| 2 | 正常系 | 未指定 | null | 成功 |

---

## 4. 追加ビジネスロジックのテストケース

### 4.1 契約期間の整合性チェック

| # | テストケース | 条件 | 期待結果 |
|---|------------|------|---------|
| 1 | 契約終了日が契約開始日より前 | contractStartDate="2024-04-01", contractEndDate="2024-03-31" | 400エラー「契約終了日は契約開始日以降である必要があります」 |
| 2 | 契約終了日が契約開始日と同日 | contractStartDate="2024-04-01", contractEndDate="2024-04-01" | 成功 |

### 4.2 企業・部署の存在チェック

| # | テストケース | 条件 | 期待結果 |
|---|------------|------|---------|
| 1 | 存在しない企業ID | companyId=無効なUUID | 400エラー「指定された企業が見つかりません」 |
| 2 | 存在しない部署ID | departmentId=無効なUUID | 400エラー「指定された部署が見つかりません」 |

### 4.3 参画期間と案件期間の整合性チェック

| # | テストケース | 条件 | 期待結果 |
|---|------------|------|---------|
| 1 | 参画開始日が案件開始日より前 | 案件開始日 > 参画開始日 | 400エラー「参画開始日は案件期間内である必要があります」 |
| 2 | 参画終了日が案件終了日より後 | 案件終了日 < 参画終了日 | 400エラー「参画終了日は案件期間内である必要があります」 |
| 3 | 参画期間が案件期間内 | 案件期間内に収まる | 成功 |

---

## 5. 推奨される修正事項

### 5.1 高優先度(重大な不整合)

1. **フロントエンド `ProjectStatus` 型の修正**
   - 現在: `'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED'`
   - 修正後: `'PROPOSAL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'`
   - 関連: `ProjectStatusLabels` の更新

### 5.2 中優先度(機能欠損)

1. **フロントエンドフォームへの未実装フィールド追加**
   - `deliveryDate`: 納品日入力フィールド
   - `budget`: 予算入力フィールド
   - `unitPrice`: 単価入力フィールド
   - `location`: 勤務地入力フィールド

2. **`CreateProjectRequest` 型への不足フィールド追加**
   - `deliveryDate?: string`
   - `budget?: number`
   - `unitPrice?: number`
   - `location?: string`

### 5.3 低優先度(改善提案)

1. **バリデーションの強化**
   - `budget`, `unitPrice` に負数チェックを追加
   - `code` のフォーマットバリデーション(英数字・ハイフンのみ等)

2. **エラーメッセージの日本語化**
   - すべてのZodエラーメッセージを日本語に統一

---

## 6. 参照ファイル一覧

| ファイルパス | 内容 |
|------------|------|
| `C:\dev\EmployeeDB\backend\src\routes\projects.ts` | Zodバリデーションスキーマ、APIエンドポイント |
| `C:\dev\EmployeeDB\backend\prisma\schema.prisma` | Prismaデータベーススキーマ定義 |
| `C:\dev\EmployeeDB\frontend\src\types\index.ts` | TypeScript型定義 |
| `C:\dev\EmployeeDB\frontend\src\pages\ProjectForm.tsx` | フロントエンドフォーム実装 |

---

**作成日**: 2026-02-03
**最終更新**: 2026-02-03

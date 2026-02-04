# 企業（Company）フィールド分析およびテストケース

## 概要

本ドキュメントでは、企業（Company）エンティティの全入力フィールドを分析し、バックエンドとフロントエンドの整合性を確認した上で、各フィールドのテストケースを定義する。

---

## 1. 全入力フィールド一覧

### 1.1 Company（企業）本体

| フィールド名 | Prisma型 | Zod型 | TypeScript型 | 必須/任意 | バリデーション |
|-------------|----------|-------|--------------|----------|---------------|
| code | String @db.VarChar(50) | z.string().min(1).max(50) | string | **必須** | 1〜50文字、重複不可（@unique） |
| name | String @db.VarChar(200) | z.string().min(1).max(200) | string | **必須** | 1〜200文字 |
| nameKana | String? @db.VarChar(200) | z.string().max(200).optional().nullable() | string? | 任意 | 最大200文字 |
| postalCode | String? @db.VarChar(10) | z.string().max(10).optional().nullable() | - (未定義) | 任意 | 最大10文字 |
| address | String? @db.Text | z.string().optional().nullable() | - (未定義) | 任意 | 文字数制限なし |
| phone | String? @db.VarChar(20) | z.string().max(20).optional().nullable() | - (未定義) | 任意 | 最大20文字 |
| website | String? @db.VarChar(500) | z.string().max(500).optional().nullable().or(z.literal('')).transform(...) | string? | 任意 | 最大500文字、空文字はnullに変換 |
| industry | String? @db.VarChar(100) | z.string().max(100).optional().nullable() | string? | 任意 | 最大100文字 |
| status | CompanyStatus @default(ACTIVE) | z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).optional().default('ACTIVE') | CompanyStatus | 任意 | ACTIVE/INACTIVE/TERMINATED、デフォルトACTIVE |
| remark | String? @db.Text | z.string().optional().nullable() | string? | 任意 | 文字数制限なし |

### 1.2 CompanyOffice（拠点）

| フィールド名 | Prisma型 | Zod型 | TypeScript型 | 必須/任意 | バリデーション |
|-------------|----------|-------|--------------|----------|---------------|
| name | String @db.VarChar(200) | z.string().min(1).max(200) | string | **必須** | 1〜200文字 |
| postalCode | String? @db.VarChar(10) | z.string().max(10).optional().nullable() | string? | 任意 | 最大10文字 |
| address | String? @db.Text | z.string().optional().nullable() | string? | 任意 | 文字数制限なし |
| phone | String? @db.VarChar(20) | z.string().max(20).optional().nullable() | string? | 任意 | 最大20文字 |
| isHeadquarters | Boolean @default(false) | z.boolean().optional().default(false) | boolean? | 任意 | デフォルトfalse |
| sortOrder | Int @default(0) | z.number().int().optional().default(0) | - (未定義) | 任意 | 整数、デフォルト0 |

### 1.3 CompanyDepartment（部署）

| フィールド名 | Prisma型 | Zod型 | TypeScript型 | 必須/任意 | バリデーション |
|-------------|----------|-------|--------------|----------|---------------|
| officeId | String? @db.Uuid | z.string().uuid().optional().nullable() | - (未定義) | 任意 | UUID形式 |
| parentId | String? @db.Uuid | z.string().uuid().optional().nullable() | string? | 任意 | UUID形式、自己参照不可 |
| type | DepartmentType | z.enum(['DIVISION', 'DEPARTMENT', 'SECTION', 'UNIT', 'OTHER']) | - (未定義) | **必須** | DIVISION/DEPARTMENT/SECTION/UNIT/OTHER |
| name | String @db.VarChar(200) | z.string().min(1).max(200) | string | **必須** | 1〜200文字 |
| sortOrder | Int @default(0) | z.number().int().optional().default(0) | - (未定義) | 任意 | 整数、デフォルト0 |

### 1.4 CompanyContact（担当窓口）

| フィールド名 | Prisma型 | Zod型 | TypeScript型 | 必須/任意 | バリデーション |
|-------------|----------|-------|--------------|----------|---------------|
| departmentId | String? @db.Uuid | z.string().uuid().optional().nullable() | string? | 任意 | UUID形式 |
| name | String @db.VarChar(100) | z.string().min(1).max(100) | string | **必須** | 1〜100文字 |
| nameKana | String? @db.VarChar(100) | z.string().max(100).optional().nullable() | string? | 任意 | 最大100文字 |
| title | String? @db.VarChar(100) | z.string().max(100).optional().nullable() | string? | 任意 | 最大100文字 |
| email | String? @db.VarChar(255) | z.string().email().max(255).optional().nullable().or(z.literal('')) | string? | 任意 | メール形式、最大255文字、空文字許容 |
| phone | String? @db.VarChar(20) | z.string().max(20).optional().nullable() | string? | 任意 | 最大20文字 |
| mobile | String? @db.VarChar(20) | z.string().max(20).optional().nullable() | string? | 任意 | 最大20文字 |
| isPrimary | Boolean @default(false) | z.boolean().optional().default(false) | boolean? | 任意 | デフォルトfalse |
| remark | String? @db.Text | z.string().optional().nullable() | string? | 任意 | 文字数制限なし |

---

## 2. バックエンドとフロントエンドの整合性チェック

### 2.1 不整合箇所

| 項目 | バックエンド | フロントエンド | 状態 | 影響度 |
|------|-------------|---------------|------|--------|
| Company.postalCode | 定義あり | CreateCompanyRequest に未定義 | **不整合** | 中：企業本体の郵便番号がフォームで設定できない |
| Company.address | 定義あり | CreateCompanyRequest に未定義 | **不整合** | 中：企業本体の住所がフォームで設定できない |
| Company.phone | 定義あり | CreateCompanyRequest に未定義 | **不整合** | 中：企業本体の電話番号がフォームで設定できない |
| CompanyOffice.sortOrder | 定義あり | CreateCompanyRequest.offices に未定義 | **不整合** | 低：拠点の並び順がフォームで設定できない |
| CompanyDepartment.type | **必須** | CreateCompanyRequest.departments に未定義 | **不整合** | 高：部署作成時に必須フィールドが欠落 |
| CompanyDepartment.officeId | 定義あり | CreateCompanyRequest.departments に未定義 | **不整合** | 中：部署と拠点の紐付けができない |
| CompanyDepartment.sortOrder | 定義あり | CreateCompanyRequest.departments に未定義 | **不整合** | 低：部署の並び順がフォームで設定できない |
| CompanyContact.sortOrder | Prisma未定義 | TypeScript未定義 | 整合（なし） | - |

### 2.2 整合している箇所

| 項目 | 状態 |
|------|------|
| Company.code | 整合 |
| Company.name | 整合 |
| Company.nameKana | 整合 |
| Company.industry | 整合 |
| Company.status | 整合 |
| Company.website | 整合 |
| Company.remark | 整合 |
| CompanyOffice.name | 整合 |
| CompanyOffice.postalCode | 整合 |
| CompanyOffice.address | 整合 |
| CompanyOffice.phone | 整合 |
| CompanyOffice.isHeadquarters | 整合 |
| CompanyContact.name | 整合 |
| CompanyContact.nameKana | 整合 |
| CompanyContact.title | 整合 |
| CompanyContact.email | 整合 |
| CompanyContact.phone | 整合 |
| CompanyContact.mobile | 整合 |
| CompanyContact.isPrimary | 整合 |
| CompanyContact.remark | 整合 |
| CompanyContact.departmentId | 整合 |

### 2.3 フロントエンドフォーム実装状況

| フィールド | CompanyForm.tsx 実装 | 備考 |
|-----------|---------------------|------|
| code | 実装済み | required属性あり |
| name | 実装済み | required属性あり |
| nameKana | 実装済み | - |
| industry | 実装済み | - |
| status | 実装済み | ドロップダウン |
| website | 実装済み | type="url" |
| remark | 実装済み | textarea |
| postalCode (会社) | **未実装** | バックエンドのみ定義 |
| address (会社) | **未実装** | バックエンドのみ定義 |
| phone (会社) | **未実装** | バックエンドのみ定義 |
| offices[] | 実装済み | 動的追加/削除 |
| contacts[] | 実装済み | 動的追加/削除 |
| departments[] | **未実装** | 型定義あるがUIなし |

---

## 3. テストケース

### 3.1 Company（企業本体）テストケース

#### 3.1.1 code（企業コード）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CO-001 | 正常系 | "COMP001" | 登録成功 |
| CO-002 | 正常系 | "A" | 登録成功（最小1文字） |
| CO-003 | 正常系 | "A"×50 | 登録成功（最大50文字） |
| CO-004 | 異常系 | "" | バリデーションエラー（必須） |
| CO-005 | 異常系 | "A"×51 | バリデーションエラー（51文字超過） |
| CO-006 | 異常系 | 既存のcode | 重複エラー（DUPLICATE_CODE） |
| CO-007 | 境界値 | 半角英数字記号混在 | 登録成功 |
| CO-008 | 境界値 | 日本語 | 登録成功（制限なし） |

#### 3.1.2 name（企業名）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| NA-001 | 正常系 | "株式会社テスト" | 登録成功 |
| NA-002 | 正常系 | "A" | 登録成功（最小1文字） |
| NA-003 | 正常系 | "あ"×200 | 登録成功（最大200文字） |
| NA-004 | 異常系 | "" | バリデーションエラー（必須） |
| NA-005 | 異常系 | "あ"×201 | バリデーションエラー（201文字超過） |
| NA-006 | 正常系 | 特殊文字含む | 登録成功 |

#### 3.1.3 nameKana（企業名カナ）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| NK-001 | 正常系 | "カブシキガイシャテスト" | 登録成功 |
| NK-002 | 正常系 | undefined | 登録成功（任意） |
| NK-003 | 正常系 | null | 登録成功（nullable） |
| NK-004 | 正常系 | "" | 登録成功（空文字可） |
| NK-005 | 正常系 | "ア"×200 | 登録成功（最大200文字） |
| NK-006 | 異常系 | "ア"×201 | バリデーションエラー（201文字超過） |

#### 3.1.4 postalCode（郵便番号）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| PC-001 | 正常系 | "123-4567" | 登録成功 |
| PC-002 | 正常系 | undefined | 登録成功（任意） |
| PC-003 | 正常系 | "1234567890" | 登録成功（最大10文字） |
| PC-004 | 異常系 | "12345678901" | バリデーションエラー（11文字超過） |
| PC-005 | 正常系 | null | 登録成功（nullable） |

#### 3.1.5 address（住所）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| AD-001 | 正常系 | "東京都渋谷区..." | 登録成功 |
| AD-002 | 正常系 | undefined | 登録成功（任意） |
| AD-003 | 正常系 | 非常に長い文字列 | 登録成功（Text型、制限なし） |
| AD-004 | 正常系 | null | 登録成功（nullable） |

#### 3.1.6 phone（電話番号）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| PH-001 | 正常系 | "03-1234-5678" | 登録成功 |
| PH-002 | 正常系 | undefined | 登録成功（任意） |
| PH-003 | 正常系 | "12345678901234567890" | 登録成功（最大20文字） |
| PH-004 | 異常系 | "123456789012345678901" | バリデーションエラー（21文字超過） |
| PH-005 | 正常系 | null | 登録成功（nullable） |

#### 3.1.7 website（Webサイト）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| WS-001 | 正常系 | "https://example.com" | 登録成功 |
| WS-002 | 正常系 | undefined | 登録成功（任意） |
| WS-003 | 正常系 | "" | 登録成功（空文字→null変換） |
| WS-004 | 正常系 | null | 登録成功（nullable） |
| WS-005 | 正常系 | "a"×500 | 登録成功（最大500文字） |
| WS-006 | 異常系 | "a"×501 | バリデーションエラー（501文字超過） |

#### 3.1.8 industry（業種）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| IN-001 | 正常系 | "情報通信業" | 登録成功 |
| IN-002 | 正常系 | undefined | 登録成功（任意） |
| IN-003 | 正常系 | "a"×100 | 登録成功（最大100文字） |
| IN-004 | 異常系 | "a"×101 | バリデーションエラー（101文字超過） |
| IN-005 | 正常系 | null | 登録成功（nullable） |

#### 3.1.9 status（ステータス）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| ST-001 | 正常系 | "ACTIVE" | 登録成功 |
| ST-002 | 正常系 | "INACTIVE" | 登録成功 |
| ST-003 | 正常系 | "TERMINATED" | 登録成功 |
| ST-004 | 正常系 | undefined | 登録成功（デフォルトACTIVE） |
| ST-005 | 異常系 | "UNKNOWN" | バリデーションエラー（無効な値） |
| ST-006 | 異常系 | "" | バリデーションエラー（無効な値） |

#### 3.1.10 remark（備考）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| RM-001 | 正常系 | "備考テスト" | 登録成功 |
| RM-002 | 正常系 | undefined | 登録成功（任意） |
| RM-003 | 正常系 | 非常に長い文字列 | 登録成功（Text型、制限なし） |
| RM-004 | 正常系 | null | 登録成功（nullable） |
| RM-005 | 正常系 | 改行含む | 登録成功 |

---

### 3.2 CompanyOffice（拠点）テストケース

#### 3.2.1 name（拠点名）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| OF-NA-001 | 正常系 | "本社" | 登録成功 |
| OF-NA-002 | 正常系 | "A" | 登録成功（最小1文字） |
| OF-NA-003 | 正常系 | "あ"×200 | 登録成功（最大200文字） |
| OF-NA-004 | 異常系 | "" | バリデーションエラー（必須） |
| OF-NA-005 | 異常系 | "あ"×201 | バリデーションエラー（201文字超過） |

#### 3.2.2 postalCode（郵便番号）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| OF-PC-001 | 正常系 | "100-0001" | 登録成功 |
| OF-PC-002 | 正常系 | undefined | 登録成功（任意） |
| OF-PC-003 | 異常系 | "12345678901" | バリデーションエラー（11文字超過） |

#### 3.2.3 address（住所）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| OF-AD-001 | 正常系 | "東京都千代田区..." | 登録成功 |
| OF-AD-002 | 正常系 | undefined | 登録成功（任意） |
| OF-AD-003 | 正常系 | 非常に長い文字列 | 登録成功（Text型） |

#### 3.2.4 phone（電話番号）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| OF-PH-001 | 正常系 | "03-1234-5678" | 登録成功 |
| OF-PH-002 | 正常系 | undefined | 登録成功（任意） |
| OF-PH-003 | 異常系 | "123456789012345678901" | バリデーションエラー（21文字超過） |

#### 3.2.5 isHeadquarters（本社フラグ）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| OF-HQ-001 | 正常系 | true | 登録成功 |
| OF-HQ-002 | 正常系 | false | 登録成功 |
| OF-HQ-003 | 正常系 | undefined | 登録成功（デフォルトfalse） |

#### 3.2.6 sortOrder（並び順）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| OF-SO-001 | 正常系 | 0 | 登録成功 |
| OF-SO-002 | 正常系 | 100 | 登録成功 |
| OF-SO-003 | 正常系 | -1 | 登録成功（負の整数許容） |
| OF-SO-004 | 正常系 | undefined | 登録成功（デフォルト0） |
| OF-SO-005 | 異常系 | 1.5 | バリデーションエラー（整数のみ） |

---

### 3.3 CompanyDepartment（部署）テストケース

#### 3.3.1 name（部署名）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| DP-NA-001 | 正常系 | "営業部" | 登録成功 |
| DP-NA-002 | 正常系 | "A" | 登録成功（最小1文字） |
| DP-NA-003 | 正常系 | "あ"×200 | 登録成功（最大200文字） |
| DP-NA-004 | 異常系 | "" | バリデーションエラー（必須） |
| DP-NA-005 | 異常系 | "あ"×201 | バリデーションエラー（201文字超過） |

#### 3.3.2 type（部署タイプ）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| DP-TY-001 | 正常系 | "DIVISION" | 登録成功 |
| DP-TY-002 | 正常系 | "DEPARTMENT" | 登録成功 |
| DP-TY-003 | 正常系 | "SECTION" | 登録成功 |
| DP-TY-004 | 正常系 | "UNIT" | 登録成功 |
| DP-TY-005 | 正常系 | "OTHER" | 登録成功 |
| DP-TY-006 | 異常系 | "" | バリデーションエラー（必須） |
| DP-TY-007 | 異常系 | "UNKNOWN" | バリデーションエラー（無効な値） |
| DP-TY-008 | 異常系 | undefined | バリデーションエラー（必須） |

#### 3.3.3 officeId（拠点ID）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| DP-OF-001 | 正常系 | 有効なUUID | 登録成功 |
| DP-OF-002 | 正常系 | undefined | 登録成功（任意） |
| DP-OF-003 | 正常系 | null | 登録成功（nullable） |
| DP-OF-004 | 異常系 | "invalid-uuid" | バリデーションエラー（UUID形式） |
| DP-OF-005 | 異常系 | 存在しないUUID | NOT_FOUNDエラー |
| DP-OF-006 | 異常系 | 別企業の拠点UUID | NOT_FOUNDエラー |

#### 3.3.4 parentId（親部署ID）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| DP-PA-001 | 正常系 | 有効なUUID | 登録成功 |
| DP-PA-002 | 正常系 | undefined | 登録成功（任意、ルート部署） |
| DP-PA-003 | 正常系 | null | 登録成功（nullable） |
| DP-PA-004 | 異常系 | "invalid-uuid" | バリデーションエラー（UUID形式） |
| DP-PA-005 | 異常系 | 存在しないUUID | NOT_FOUNDエラー |
| DP-PA-006 | 異常系 | 自分自身のID | INVALID_PARENTエラー（循環参照） |
| DP-PA-007 | 異常系 | 別企業の部署UUID | NOT_FOUNDエラー |

#### 3.3.5 sortOrder（並び順）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| DP-SO-001 | 正常系 | 0 | 登録成功 |
| DP-SO-002 | 正常系 | 100 | 登録成功 |
| DP-SO-003 | 正常系 | undefined | 登録成功（デフォルト0） |
| DP-SO-004 | 異常系 | 1.5 | バリデーションエラー（整数のみ） |

---

### 3.4 CompanyContact（担当窓口）テストケース

#### 3.4.1 name（担当者名）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-NA-001 | 正常系 | "山田太郎" | 登録成功 |
| CT-NA-002 | 正常系 | "A" | 登録成功（最小1文字） |
| CT-NA-003 | 正常系 | "あ"×100 | 登録成功（最大100文字） |
| CT-NA-004 | 異常系 | "" | バリデーションエラー（必須） |
| CT-NA-005 | 異常系 | "あ"×101 | バリデーションエラー（101文字超過） |

#### 3.4.2 nameKana（担当者名カナ）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-NK-001 | 正常系 | "ヤマダタロウ" | 登録成功 |
| CT-NK-002 | 正常系 | undefined | 登録成功（任意） |
| CT-NK-003 | 正常系 | "ア"×100 | 登録成功（最大100文字） |
| CT-NK-004 | 異常系 | "ア"×101 | バリデーションエラー（101文字超過） |

#### 3.4.3 title（役職）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-TI-001 | 正常系 | "部長" | 登録成功 |
| CT-TI-002 | 正常系 | undefined | 登録成功（任意） |
| CT-TI-003 | 正常系 | "a"×100 | 登録成功（最大100文字） |
| CT-TI-004 | 異常系 | "a"×101 | バリデーションエラー（101文字超過） |

#### 3.4.4 email（メールアドレス）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-EM-001 | 正常系 | "test@example.com" | 登録成功 |
| CT-EM-002 | 正常系 | undefined | 登録成功（任意） |
| CT-EM-003 | 正常系 | "" | 登録成功（空文字許容→null変換） |
| CT-EM-004 | 正常系 | null | 登録成功（nullable） |
| CT-EM-005 | 異常系 | "invalid-email" | バリデーションエラー（メール形式） |
| CT-EM-006 | 正常系 | "a"×243+"@example.com" | 登録成功（最大255文字） |
| CT-EM-007 | 異常系 | "a"×244+"@example.com" | バリデーションエラー（256文字超過） |

#### 3.4.5 phone（電話番号）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-PH-001 | 正常系 | "03-1234-5678" | 登録成功 |
| CT-PH-002 | 正常系 | undefined | 登録成功（任意） |
| CT-PH-003 | 正常系 | "12345678901234567890" | 登録成功（最大20文字） |
| CT-PH-004 | 異常系 | "123456789012345678901" | バリデーションエラー（21文字超過） |

#### 3.4.6 mobile（携帯番号）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-MO-001 | 正常系 | "090-1234-5678" | 登録成功 |
| CT-MO-002 | 正常系 | undefined | 登録成功（任意） |
| CT-MO-003 | 正常系 | "12345678901234567890" | 登録成功（最大20文字） |
| CT-MO-004 | 異常系 | "123456789012345678901" | バリデーションエラー（21文字超過） |

#### 3.4.7 departmentId（所属部署ID）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-DP-001 | 正常系 | 有効なUUID | 登録成功 |
| CT-DP-002 | 正常系 | undefined | 登録成功（任意） |
| CT-DP-003 | 正常系 | null | 登録成功（nullable） |
| CT-DP-004 | 異常系 | "invalid-uuid" | バリデーションエラー（UUID形式） |
| CT-DP-005 | 異常系 | 存在しないUUID | NOT_FOUNDエラー |
| CT-DP-006 | 異常系 | 別企業の部署UUID | NOT_FOUNDエラー |

#### 3.4.8 isPrimary（主担当フラグ）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-IP-001 | 正常系 | true | 登録成功 |
| CT-IP-002 | 正常系 | false | 登録成功 |
| CT-IP-003 | 正常系 | undefined | 登録成功（デフォルトfalse） |

#### 3.4.9 remark（備考）

| テストID | 区分 | 入力値 | 期待結果 |
|----------|------|--------|---------|
| CT-RM-001 | 正常系 | "備考テスト" | 登録成功 |
| CT-RM-002 | 正常系 | undefined | 登録成功（任意） |
| CT-RM-003 | 正常系 | 非常に長い文字列 | 登録成功（Text型） |
| CT-RM-004 | 正常系 | null | 登録成功（nullable） |

---

## 4. API エンドポイント整理

### 4.1 企業 CRUD

| メソッド | エンドポイント | 認可 | 説明 |
|---------|---------------|------|------|
| GET | /api/companies | requireAuth | 企業一覧（検索、フィルタ、ページネーション） |
| GET | /api/companies/:id | requireAuth | 企業詳細 |
| POST | /api/companies | requireEditor | 企業新規登録 |
| PUT | /api/companies/:id | requireEditor | 企業更新 |
| DELETE | /api/companies/:id | requireEditor | 企業削除 |

### 4.2 拠点 CRUD

| メソッド | エンドポイント | 認可 | 説明 |
|---------|---------------|------|------|
| GET | /api/companies/:companyId/offices | requireAuth | 拠点一覧 |
| POST | /api/companies/:companyId/offices | requireEditor | 拠点追加 |
| PUT | /api/companies/:companyId/offices/:id | requireEditor | 拠点更新 |
| DELETE | /api/companies/:companyId/offices/:id | requireEditor | 拠点削除 |

### 4.3 部署 CRUD

| メソッド | エンドポイント | 認可 | 説明 |
|---------|---------------|------|------|
| GET | /api/companies/:companyId/departments | requireAuth | 部署一覧（フラット） |
| GET | /api/companies/:companyId/departments/tree | requireAuth | 部署ツリー（階層構造） |
| POST | /api/companies/:companyId/departments | requireEditor | 部署追加 |
| PUT | /api/companies/:companyId/departments/:id | requireEditor | 部署更新 |
| DELETE | /api/companies/:companyId/departments/:id | requireEditor | 部署削除（子部署がある場合エラー） |

### 4.4 担当窓口 CRUD

| メソッド | エンドポイント | 認可 | 説明 |
|---------|---------------|------|------|
| GET | /api/companies/:companyId/contacts | requireAuth | 担当窓口一覧 |
| POST | /api/companies/:companyId/contacts | requireEditor | 担当窓口追加 |
| PUT | /api/companies/:companyId/contacts/:id | requireEditor | 担当窓口更新 |
| DELETE | /api/companies/:companyId/contacts/:id | requireEditor | 担当窓口削除 |

---

## 5. 推奨対応事項

### 5.1 高優先度

1. **フロントエンド型定義の修正**
   - `CreateCompanyRequest.departments` に `type` フィールドを追加（必須）
   - `CreateCompanyRequest.departments` に `officeId` フィールドを追加

2. **フロントエンドフォームの修正**
   - `CompanyForm.tsx` に部署管理UIを追加
   - 部署タイプ（type）の選択UIを実装

### 5.2 中優先度

1. **フロントエンド型定義の修正**
   - `CreateCompanyRequest` に `postalCode`, `address`, `phone` を追加
   - `CreateCompanyRequest.offices` に `sortOrder` を追加
   - `CreateCompanyRequest.departments` に `sortOrder` を追加

2. **フロントエンドフォームの修正**
   - 企業本体の郵便番号、住所、電話番号入力欄を追加
   - 拠点・部署の並び順入力欄を追加

### 5.3 低優先度

1. バリデーションメッセージの日本語化
2. 郵便番号、電話番号のフォーマットバリデーション追加

---

## 6. 参照ファイル

- バックエンドルート: `C:\dev\EmployeeDB\backend\src\routes\companies.ts`
- Prismaスキーマ: `C:\dev\EmployeeDB\backend\prisma\schema.prisma`
- フロントエンド型定義: `C:\dev\EmployeeDB\frontend\src\types\index.ts`
- フロントエンドフォーム: `C:\dev\EmployeeDB\frontend\src\pages\CompanyForm.tsx`

---

**作成日**: 2026-02-03
**最終更新**: 2026-02-03

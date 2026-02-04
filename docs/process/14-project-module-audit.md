# 案件（Project）モジュール完全仕様調査レポート

調査日: 2026-02-04

## 1. 全フィールドの列挙（DB → API → フロントエンド）

### 1.1 Project（案件）テーブル

#### データベース（Prisma Schema）

| フィールド名 | DB型 | 必須 | デフォルト | 説明 |
|-------------|------|------|-----------|------|
| id | UUID | Yes | auto | 主キー |
| companyId | UUID | Yes | - | 企業ID（外部キー） |
| departmentId | UUID | No | - | 部署ID（外部キー） |
| code | VARCHAR(50) | Yes | - | 案件コード（ユニーク） |
| name | VARCHAR(200) | Yes | - | 案件名 |
| description | TEXT | No | - | 説明 |
| contractType | ENUM | Yes | - | 契約形態（DISPATCH/SES/CONTRACT） |
| contractStartDate | DATE | No | - | 契約開始日 |
| contractEndDate | DATE | No | - | 契約終了日 |
| deliveryDate | DATE | No | - | 納品日 |
| budget | DECIMAL(15,2) | No | - | 予算 |
| unitPrice | DECIMAL(15,2) | No | - | 単価 |
| status | ENUM | Yes | PROPOSAL | ステータス |
| location | VARCHAR(200) | No | - | 勤務地 |
| remark | TEXT | No | - | 備考 |
| createdAt | TIMESTAMP | Yes | now() | 作成日時 |
| updatedAt | TIMESTAMP | Yes | auto | 更新日時 |

#### バックエンドAPI（Zod Schema）

**作成スキーマ (projectSchema)**

| フィールド名 | 型 | 必須 | バリデーション |
|-------------|-----|------|---------------|
| code | string | Yes | min(1), max(50) |
| name | string | Yes | min(1), max(200) |
| description | string | No | nullable |
| companyId | string | Yes | uuid |
| departmentId | string | No | uuid, nullable |
| contractType | enum | Yes | DISPATCH/SES/CONTRACT |
| contractStartDate | string | No | nullable |
| contractEndDate | string | No | nullable |
| deliveryDate | string | No | nullable |
| budget | number | No | nullable |
| unitPrice | number | No | nullable |
| status | enum | No | default: PROPOSAL |
| location | string | No | max(200), nullable |
| remark | string | No | nullable |

**更新スキーマ (projectUpdateSchema)** - 全フィールドがoptional

#### フロントエンド型定義

**Project インターフェース**

| フィールド名 | 型 | 必須 | 備考 |
|-------------|-----|------|------|
| id | string | Yes | - |
| code | string | Yes | - |
| companyId | string | Yes | - |
| company | Company | No | リレーション |
| departmentId | string | No | - |
| department | CompanyDepartment | No | リレーション |
| name | string | Yes | - |
| description | string | No | - |
| status | ProjectStatus | Yes | - |
| contractType | ContractTypeProject | Yes | - |
| contractStartDate | string | No | - |
| contractEndDate | string | No | - |
| remark | string | No | - |
| createdAt | string | Yes | - |
| updatedAt | string | Yes | - |
| assignments | ProjectAssignment[] | No | リレーション |

**CreateProjectRequest インターフェース**

| フィールド名 | 型 | 必須 |
|-------------|-----|------|
| code | string | Yes |
| companyId | string | Yes |
| departmentId | string | No |
| name | string | Yes |
| description | string | No |
| status | ProjectStatus | No |
| contractType | ContractTypeProject | Yes |
| contractStartDate | string | No |
| contractEndDate | string | No |
| remark | string | No |

### 1.2 ProjectAssignment（案件参画）テーブル

#### データベース（Prisma Schema）

| フィールド名 | DB型 | 必須 | デフォルト | 説明 |
|-------------|------|------|-----------|------|
| id | UUID | Yes | auto | 主キー |
| projectId | UUID | Yes | - | 案件ID（外部キー） |
| employeeId | UUID | Yes | - | 社員ID（外部キー） |
| role | VARCHAR(100) | No | - | 役割 |
| assignmentStartDate | DATE | Yes | - | 参画開始日 |
| assignmentEndDate | DATE | No | - | 参画終了日 |
| workloadPercentage | INT | No | - | 稼働率（0-100） |
| unitPrice | DECIMAL(15,2) | No | - | 単価 |
| billingType | ENUM | No | - | 請求形態 |
| status | ENUM | Yes | SCHEDULED | 参画ステータス |
| remark | TEXT | No | - | 備考 |
| createdAt | TIMESTAMP | Yes | now() | 作成日時 |
| updatedAt | TIMESTAMP | Yes | auto | 更新日時 |

#### バックエンドAPI（Zod Schema）

**参画作成スキーマ (assignmentSchema)**

| フィールド名 | 型 | 必須 | バリデーション |
|-------------|-----|------|---------------|
| employeeId | string | Yes | uuid |
| role | string | No | max(100), nullable |
| assignmentStartDate | string | Yes | - |
| assignmentEndDate | string | No | nullable |
| workloadPercentage | number | No | int, 0-100, nullable |
| unitPrice | number | No | nullable |
| billingType | enum | No | HOURLY/DAILY/MONTHLY/FIXED, nullable |
| status | enum | No | default: SCHEDULED |
| remark | string | No | nullable |

**参画更新スキーマ (assignmentUpdateSchema)** - employeeId以外がoptional

#### フロントエンド型定義

**ProjectAssignment インターフェース**

| フィールド名 | 型 | 必須 | 備考 |
|-------------|-----|------|------|
| id | string | Yes | - |
| projectId | string | Yes | - |
| employeeId | string | Yes | - |
| project | Project | No | リレーション |
| employee | Employee | No | リレーション |
| startDate | string | Yes | **不整合: DBはassignmentStartDate** |
| endDate | string | No | **不整合: DBはassignmentEndDate** |
| role | string | No | - |
| workloadPercentage | number | No | - |
| remark | string | No | - |
| createdAt | string | Yes | - |
| updatedAt | string | Yes | - |

**CreateProjectAssignmentRequest インターフェース**

| フィールド名 | 型 | 必須 |
|-------------|-----|------|
| projectId | string | Yes |
| employeeId | string | Yes |
| assignmentStartDate | string | Yes |
| assignmentEndDate | string | No |
| role | string | No |
| workloadPercentage | number | No |
| remark | string | No |

---

## 2. CRUD各操作のリクエスト/レスポンス形式

### 2.1 案件一覧取得

**エンドポイント**: `GET /api/projects`

**クエリパラメータ**:
```typescript
{
  keyword?: string;        // 案件名、コード、説明、勤務地で検索
  companyId?: string;      // 企業IDでフィルタ
  status?: ProjectStatus;  // ステータスでフィルタ
  contractType?: ContractTypeProject; // 契約形態でフィルタ
  page?: number;           // ページ番号 (default: 1)
  limit?: number;          // 取得件数 (default: 20, max: 100)
  sortBy?: string;         // ソートキー (default: 'createdAt')
  sortOrder?: 'asc'|'desc'; // ソート順 (default: 'desc')
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: Project[], // company, department, assignments含む
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**include される関連データ**:
- `company`: { id, code, name }
- `department`: { id, name }
- `assignments`: { id, status }

### 2.2 案件詳細取得

**エンドポイント**: `GET /api/projects/:id`

**レスポンス**:
```typescript
{
  success: true,
  data: Project // 全リレーション含む
}
```

**include される関連データ**:
- `company`: 全フィールド
- `department`: 全フィールド
- `assignments`: employee情報含む（fullName, email, department, position等）

### 2.3 案件作成

**エンドポイント**: `POST /api/projects`

**権限**: requireEditor (ADMIN/EDITOR)

**リクエストボディ**:
```typescript
{
  code: string;            // 必須
  name: string;            // 必須
  companyId: string;       // 必須
  contractType: ContractTypeProject; // 必須
  description?: string;
  departmentId?: string;
  contractStartDate?: string; // YYYY-MM-DD
  contractEndDate?: string;
  deliveryDate?: string;
  budget?: number;
  unitPrice?: number;
  status?: ProjectStatus;  // default: PROPOSAL
  location?: string;
  remark?: string;
}
```

**バリデーション**:
1. 契約期間の妥当性チェック（開始日 <= 終了日）
2. 企業の存在確認
3. 部署の存在確認（指定時）

**レスポンス**:
```typescript
{
  success: true,
  data: Project // company, department, assignments含む
}
```

### 2.4 案件更新

**エンドポイント**: `PUT /api/projects/:id`

**権限**: requireEditor (ADMIN/EDITOR)

**リクエストボディ**: 作成と同様だが全フィールドがoptional

**バリデーション**:
1. 案件の存在確認
2. 企業の存在確認（変更時）

**レスポンス**:
```typescript
{
  success: true,
  data: Project
}
```

### 2.5 案件削除

**エンドポイント**: `DELETE /api/projects/:id`

**権限**: requireEditor (ADMIN/EDITOR)

**レスポンス**:
```typescript
{
  success: true,
  data: { message: '案件を削除しました' }
}
```

---

## 3. ProjectAssignment（参画）の処理

### 3.1 参画一覧取得

**エンドポイント**: `GET /api/projects/:projectId/assignments`

**権限**: requireAuth (全ユーザー)

**レスポンス**:
```typescript
{
  success: true,
  data: ProjectAssignment[] // employee情報含む
}
```

### 3.2 参画追加

**エンドポイント**: `POST /api/projects/:projectId/assignments`

**権限**: requireEditor (ADMIN/EDITOR)

**リクエストボディ**:
```typescript
{
  employeeId: string;           // 必須
  assignmentStartDate: string;  // 必須 (YYYY-MM-DD)
  role?: string;
  assignmentEndDate?: string;
  workloadPercentage?: number;  // 0-100
  unitPrice?: number;
  billingType?: BillingType;
  status?: AssignmentStatus;    // default: SCHEDULED
  remark?: string;
}
```

**バリデーション**:
1. 参画期間の妥当性チェック（開始日 <= 終了日）
2. 案件の存在確認
3. 社員の存在確認
4. **参画期間が案件期間内かチェック**

**レスポンス**:
```typescript
{
  success: true,
  data: ProjectAssignment // employee, project情報含む
}
```

### 3.3 参画更新

**エンドポイント**: `PUT /api/projects/:projectId/assignments/:id`

**権限**: requireEditor (ADMIN/EDITOR)

**リクエストボディ**: 全フィールドがoptional（employeeId変更不可）

**レスポンス**:
```typescript
{
  success: true,
  data: ProjectAssignment
}
```

### 3.4 参画削除

**エンドポイント**: `DELETE /api/projects/:projectId/assignments/:id`

**権限**: requireEditor (ADMIN/EDITOR)

**レスポンス**:
```typescript
{
  success: true,
  data: { message: '参画を解除しました' }
}
```

---

## 4. 企業・部署との関連

### 4.1 リレーション構造

```
Company (1) ─────┬───── (*) Project
                 │
CompanyDepartment (1) ── (*) Project (optional)
```

### 4.2 企業選択時の部署連動

**フロントエンド実装 (ProjectForm.tsx)**:
1. 企業ドロップダウンで企業を選択
2. 選択された企業の `departments` 配列から部署リストを生成
3. 企業変更時は `departmentId` をリセット

**注意点**:
- `useCompanies({ limit: 100 })` で企業一覧を取得
- 企業データに `departments` が含まれている必要がある

### 4.3 バックエンドでの検証

- 案件作成時: 企業の存在を検証
- 案件作成時: 部署の存在を検証（指定時）
- 案件更新時: 企業変更時に企業の存在を検証

---

## 5. ステータス管理

### 5.1 案件ステータス (ProjectStatus)

| 値 | 日本語表示 | 説明 |
|----|-----------|------|
| PROPOSAL | 提案中 | 提案・見積段階 |
| IN_PROGRESS | 進行中 | 契約中・稼働中 |
| ON_HOLD | 保留 | 一時停止 |
| COMPLETED | 完了 | 契約完了 |
| CANCELLED | キャンセル | 中止・失注 |

### 5.2 参画ステータス (AssignmentStatus)

| 値 | 日本語表示 | 説明 |
|----|-----------|------|
| SCHEDULED | 予定 | 参画予定 |
| IN_PROGRESS | 参画中 | 現在参画中 |
| COMPLETED | 終了 | 参画終了 |

### 5.3 請求形態 (BillingType)

| 値 | 日本語表示 |
|----|-----------|
| HOURLY | 時給 |
| DAILY | 日給 |
| MONTHLY | 月給 |
| FIXED | 固定額 |

---

## 6. 不整合・実装漏れの列挙

### 6.1 重大な不整合

#### Issue #1: フロントエンド型定義とDBフィールド名の不一致

**ファイル**: `frontend/src/types/index.ts` (Line 443-444)

| フロントエンド | バックエンドAPI/DB |
|---------------|-------------------|
| `startDate` | `assignmentStartDate` |
| `endDate` | `assignmentEndDate` |

**影響**:
- ProjectDetail.tsx (Line 238-242) で `assignment.startDate` / `assignment.endDate` を参照
- APIレスポンスは `assignmentStartDate` / `assignmentEndDate` を返す
- **データが表示されない可能性あり**

#### Issue #2: Project型定義にDBフィールドが欠落

**欠落フィールド**:
| フィールド | DB | フロントエンド型 |
|-----------|----|--------------------|
| deliveryDate | あり | **なし** |
| budget | あり | **なし** |
| unitPrice | あり | **なし** |
| location | あり | **なし** |

**影響**: フォームでこれらのフィールドを扱えない

#### Issue #3: ProjectAssignment型定義にDBフィールドが欠落

**欠落フィールド**:
| フィールド | DB | フロントエンド型 |
|-----------|----|--------------------|
| unitPrice | あり | **なし** |
| billingType | あり | **なし** |
| status | あり | **なし** |

**影響**: 参画の単価・請求形態・ステータスを表示できない

### 6.2 中程度の問題

#### Issue #4: ProjectList.tsxのステータスフィルタ値が不正

**ファイル**: `frontend/src/pages/ProjectList.tsx` (Line 107-111)

```html
<option value="ACTIVE">稼働中</option>
<option value="INACTIVE">休止中</option>
```

**正しい値**:
```html
<option value="PROPOSAL">提案中</option>
<option value="IN_PROGRESS">進行中</option>
<option value="ON_HOLD">保留</option>
<option value="COMPLETED">完了</option>
<option value="CANCELLED">キャンセル</option>
```

**影響**: ステータスフィルタが正しく動作しない

#### Issue #5: CreateProjectRequestにDBフィールドが欠落

**欠落フィールド**:
- `deliveryDate`
- `budget`
- `unitPrice`
- `location`

**影響**: これらのフィールドを案件登録時に設定できない

#### Issue #6: ProjectFormにDBフィールドの入力UIがない

**欠落フィールド**:
- `deliveryDate` (納品日)
- `budget` (予算)
- `unitPrice` (単価)
- `location` (勤務地)

**影響**: フォームからこれらの情報を入力できない

### 6.3 軽微な問題

#### Issue #7: 参画追加モーダルでステータス・請求形態の入力がない

**ファイル**: `frontend/src/pages/ProjectDetail.tsx`

モーダルで入力できない項目:
- `status` (参画ステータス)
- `billingType` (請求形態)
- `unitPrice` (単価)

**影響**: これらの情報はデフォルト値のまま、後から編集もできない

#### Issue #8: 参画編集機能がフロントエンドに実装されていない

**現状**:
- `useUpdateProjectAssignment` フックは存在する
- ProjectDetail.tsx に編集UIがない（削除のみ）

**影響**: 参画情報の更新にはAPI直接呼び出しが必要

#### Issue #9: searchParamsのsortByとAPIパラメータのマッピング

**ファイル**: `frontend/src/types/index.ts` (Line 552)

```typescript
sortBy?: 'name' | 'startDate' | 'endDate' | 'createdAt';
```

バックエンドは任意のフィールド名を受け付けるが、`startDate`/`endDate` はDBフィールド名と異なる。

### 6.4 検討事項

#### Issue #10: 重複参画のチェックがない

同一社員を同一案件に複数回参画させることが可能。
- 期間重複のチェックなし
- 同一レコードの重複チェックなし

#### Issue #11: 企業削除時の案件の扱い

Prismaスキーマで `onDelete: Cascade` が設定されているため、企業削除時に関連する全案件が削除される。
- 削除前の警告がない
- 論理削除ではなく物理削除

---

## 7. まとめ

### 実装状況サマリー

| 機能 | バックエンド | フロントエンド | 備考 |
|------|------------|---------------|------|
| 案件一覧 | 完了 | 完了 | ステータスフィルタ値に問題 |
| 案件詳細 | 完了 | 完了 | - |
| 案件作成 | 完了 | 一部欠落 | 4フィールド欠落 |
| 案件更新 | 完了 | 一部欠落 | 4フィールド欠落 |
| 案件削除 | 完了 | 完了 | - |
| 参画一覧 | 完了 | 完了 | - |
| 参画追加 | 完了 | 一部欠落 | 3フィールド欠落 |
| 参画更新 | 完了 | **未実装** | UIなし |
| 参画削除 | 完了 | 完了 | - |

### 優先度別修正項目

**高優先度（機能に影響）**:
1. ProjectAssignment型の `startDate`/`endDate` を `assignmentStartDate`/`assignmentEndDate` に修正
2. ProjectList.tsxのステータスフィルタ値を修正

**中優先度（機能拡張）**:
1. Project型に欠落フィールド（deliveryDate, budget, unitPrice, location）を追加
2. ProjectFormに欠落フィールドの入力UIを追加
3. 参画編集UIの実装

**低優先度（改善）**:
1. 重複参画チェックの追加
2. カスケード削除の警告実装
3. ProjectAssignment型に欠落フィールド追加

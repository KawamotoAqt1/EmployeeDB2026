# 案件フォーム（ProjectForm.tsx）フロントエンド実装テスト結果

## テスト日時
2026-02-03

## 検証対象ファイル
- `frontend/src/pages/ProjectForm.tsx`
- `frontend/src/hooks/useProjects.ts`
- `frontend/src/types/index.ts`
- `backend/src/routes/projects.ts`
- `backend/prisma/schema.prisma`

---

## 1. フォームの初期値検証

### 検証項目
フォームの初期値（特に `status: 'PROPOSAL'`）が正しいか

### 結果: OK

**ProjectForm.tsx（18-29行目）:**
```typescript
const [formData, setFormData] = useState<CreateProjectRequest>({
  code: '',
  companyId: '',
  departmentId: undefined,
  name: '',
  description: '',
  status: 'PROPOSAL',      // 正しい
  contractType: 'DISPATCH',
  contractStartDate: '',
  contractEndDate: '',
  remark: '',
});
```

**バックエンド（projects.ts 39行目）:**
```typescript
status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional().default('PROPOSAL'),
```

初期値 `'PROPOSAL'` はバックエンドのデフォルト値と一致しています。

---

## 2. useEffectでの既存データ読み込み検証

### 検証項目
編集モード時に既存データが正しく読み込まれるか

### 結果: OK (軽微な注意点あり)

**ProjectForm.tsx（33-49行目）:**
```typescript
useEffect(() => {
  if (project) {
    setFormData({
      code: project.code || '',
      companyId: project.companyId,
      departmentId: project.departmentId,
      name: project.name,
      description: project.description,
      status: project.status,
      contractType: project.contractType,
      contractStartDate: project.contractStartDate ? project.contractStartDate.split('T')[0] : '',
      contractEndDate: project.contractEndDate ? project.contractEndDate.split('T')[0] : '',
      remark: project.remark,
    });
    setSelectedCompany(project.companyId);
  }
}, [project]);
```

**評価:**
- 依存配列に `project` が含まれており、データ取得後に正しく実行される
- 日付フィールドは ISO 文字列から `YYYY-MM-DD` 形式に変換されている（`split('T')[0]`）
- `selectedCompany` も正しく設定されている

**注意点:**
`project` インターフェースでは `startDate` / `endDate` と定義されているが、`CreateProjectRequest` では `contractStartDate` / `contractEndDate` を使用している。現在のコードは `project.contractStartDate` を参照しているため、型定義との不整合がある（後述の問題3参照）。

---

## 3. フィールド名の整合性検証

### 検証項目
フィールド名がバックエンドと一致しているか（特に `contractStartDate`, `contractEndDate`）

### 結果: 問題あり

#### 3.1 CreateProjectRequest（正しい）

**types/index.ts（490-501行目）:**
```typescript
export interface CreateProjectRequest {
  code: string;
  companyId: string;
  departmentId?: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  contractType: ContractTypeProject;
  contractStartDate?: string;   // 正しい
  contractEndDate?: string;     // 正しい
  remark?: string;
}
```

**バックエンド（projects.ts 34-35行目）:**
```typescript
contractStartDate: z.string().optional().nullable(),
contractEndDate: z.string().optional().nullable(),
```

`CreateProjectRequest` のフィールド名はバックエンドと一致しています。

#### 3.2 Project インターフェース（問題あり）

**types/index.ts（414-431行目）:**
```typescript
export interface Project {
  id: string;
  companyId: string;
  company?: Company;
  departmentId?: string;
  department?: CompanyDepartment;
  name: string;
  description?: string;
  status: ProjectStatus;
  contractType: ContractTypeProject;
  startDate?: string;    // 問題: バックエンドは contractStartDate
  endDate?: string;      // 問題: バックエンドは contractEndDate
  remark?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: ProjectAssignment[];
}
```

**Prismaスキーマ（schema.prisma 287-288行目）:**
```prisma
contractStartDate   DateTime?          @map("contract_start_date") @db.Date
contractEndDate     DateTime?          @map("contract_end_date") @db.Date
```

**バックエンドレスポンス:**
Prismaが返すJSONでは `contractStartDate` / `contractEndDate` が使用される。

**影響:**
- `ProjectForm.tsx` の `useEffect` で `project.contractStartDate` を参照しているが、`Project` 型では `startDate` と定義されているため、TypeScript の型チェックが通らない可能性がある
- 現在は `any` 型で回避されている可能性があるが、型安全性が損なわれている

---

## 4. 企業選択時の部署リスト連動検証

### 検証項目
企業選択時に部署リストが正しく連動するか

### 結果: OK

**ProjectForm.tsx（73行目、187-220行目）:**
```typescript
const selectedCompanyData = companiesData?.data.find((c: any) => c.id === selectedCompany);

// 企業選択時の処理
onChange={(e) => {
  setFormData({ ...formData, companyId: e.target.value, departmentId: undefined });
  setSelectedCompany(e.target.value);
}}

// 部署選択（選択した企業に部署がある場合のみ表示）
{selectedCompanyData?.departments && selectedCompanyData.departments.length > 0 && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      部署
    </label>
    <select
      value={formData.departmentId || ''}
      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || undefined })}
      ...
    >
      <option value="">選択してください</option>
      {selectedCompanyData.departments.map((dept: any) => (
        <option key={dept.id} value={dept.id}>
          {dept.name}
        </option>
      ))}
    </select>
  </div>
)}
```

**評価:**
- 企業選択時に `departmentId` が `undefined` にリセットされる
- 選択した企業の部署データが正しく表示される
- 部署がない場合は部署選択UIが非表示になる

---

## 5. ステータスの選択肢検証

### 検証項目
ステータスの選択肢がバックエンドの enum と一致しているか

### 結果: 部分的に問題あり

#### 5.1 フォームの選択肢（正しい）

**ProjectForm.tsx（149-155行目）:**
```typescript
<select
  value={formData.status}
  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
  ...
>
  <option value="PROPOSAL">提案中</option>
  <option value="IN_PROGRESS">進行中</option>
  <option value="ON_HOLD">保留</option>
  <option value="COMPLETED">完了</option>
  <option value="CANCELLED">キャンセル</option>
</select>
```

**バックエンドZodスキーマ（projects.ts 18行目）:**
```typescript
status: z.enum(['PROPOSAL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD']).optional(),
```

**Prismaスキーマ（schema.prisma 318-324行目）:**
```prisma
enum ProjectStatus {
  PROPOSAL      // 提案中
  IN_PROGRESS   // 進行中
  COMPLETED     // 完了
  CANCELLED     // 中止
  ON_HOLD       // 保留
}
```

フォームの選択肢はバックエンドと完全に一致しています。

#### 5.2 型定義（問題あり）

**types/index.ts（336-344行目）:**
```typescript
export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED';

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  ACTIVE: '稼働中',
  INACTIVE: '休止中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
};
```

**問題:**
- フロントエンドの `ProjectStatus` 型定義がバックエンドと完全に不一致
- バックエンド: `'PROPOSAL' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'`
- フロントエンド: `'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED'`
- `ProjectStatusLabels` も同様に不一致

---

## 問題一覧と修正案

### 問題1: ProjectStatus 型定義の不一致（重要度: 高）

**現在の状態:**
```typescript
export type ProjectStatus = 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED';
```

**修正案:**
```typescript
export type ProjectStatus = 'PROPOSAL' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  PROPOSAL: '提案中',
  IN_PROGRESS: '進行中',
  ON_HOLD: '保留',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
};
```

### 問題2: Project インターフェースの日付フィールド名不一致（重要度: 高）

**現在の状態:**
```typescript
export interface Project {
  ...
  startDate?: string;
  endDate?: string;
  ...
}
```

**修正案:**
```typescript
export interface Project {
  ...
  contractStartDate?: string;
  contractEndDate?: string;
  ...
}
```

### 問題3: Project インターフェースに code フィールドがない（重要度: 中）

**現在の状態:**
`Project` インターフェースに `code` フィールドが定義されていない。

**修正案:**
```typescript
export interface Project {
  id: string;
  code: string;  // 追加
  companyId: string;
  ...
}
```

---

## 修正が必要なファイル

### frontend/src/types/index.ts

以下の変更が必要:

1. **ProjectStatus 型を修正（336-344行目）:**
```typescript
/** 案件ステータス */
export type ProjectStatus = 'PROPOSAL' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';

/** 案件ステータスの表示名 */
export const ProjectStatusLabels: Record<ProjectStatus, string> = {
  PROPOSAL: '提案中',
  IN_PROGRESS: '進行中',
  ON_HOLD: '保留',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
};
```

2. **Project インターフェースを修正（414-431行目）:**
```typescript
/** 案件 */
export interface Project {
  id: string;
  code: string;  // 追加
  companyId: string;
  company?: Company;
  departmentId?: string;
  department?: CompanyDepartment;
  name: string;
  description?: string;
  status: ProjectStatus;
  contractType: ContractTypeProject;
  contractStartDate?: string;  // startDate から変更
  contractEndDate?: string;    // endDate から変更
  remark?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: ProjectAssignment[];
}
```

---

## 検証結果サマリー

| チェック項目 | 結果 | 備考 |
|-------------|------|------|
| フォーム初期値（status: 'PROPOSAL'） | OK | バックエンドと一致 |
| useEffect での既存データ読み込み | OK | 正しく実装されている |
| contractStartDate / contractEndDate フィールド名 | NG | 型定義が不一致 |
| 企業選択時の部署リスト連動 | OK | 正しく実装されている |
| ステータス選択肢 | 部分OK | フォームは正しいが型定義が不一致 |

## 結論

`ProjectForm.tsx` のフォーム実装自体は正しく動作しますが、`frontend/src/types/index.ts` の型定義に複数の不整合があります。これにより TypeScript の型チェックが正しく機能しない可能性があり、早急な修正が推奨されます。

特に `ProjectStatus` 型と `Project` インターフェースの修正が必要です。

# 企業フォーム（CompanyForm.tsx）フロントエンド検証レポート

## 検証日時
2026-02-03

## 検証対象ファイル
- `frontend/src/pages/CompanyForm.tsx`
- `frontend/src/hooks/useCompanies.ts`
- `frontend/src/types/index.ts`
- `backend/src/routes/companies.ts`

---

## 1. フォーム実装の確認

### 1.1 フォームの初期値
**ステータス: 問題なし**

```typescript
const [formData, setFormData] = useState<CreateCompanyRequest>({
  code: '',
  name: '',
  nameKana: '',
  industry: '',
  status: 'ACTIVE',
  website: '',
  remark: '',
  offices: [],
  departments: [],
  contacts: [],
});
```

- 全てのフィールドに適切な初期値が設定されている
- `status` のデフォルト値 `'ACTIVE'` はバックエンドのZodスキーマと一致

### 1.2 useEffectでの既存データ読み込み
**ステータス: 問題なし**

```typescript
useEffect(() => {
  if (company) {
    setFormData({
      code: company.code || '',
      name: company.name,
      nameKana: company.nameKana,
      industry: company.industry,
      status: company.status,
      website: company.website,
      remark: company.remark,
      offices: company.offices?.map(o => ({...})) || [],
      departments: company.departments?.map(d => ({...})) || [],
      contacts: company.contacts?.map(c => ({...})) || [],
    });
  }
}, [company]);
```

- `company` オブジェクトが存在する場合のみフォームデータを更新
- オプショナルチェーン (`?.`) と空配列フォールバック (`|| []`) で安全に処理

---

## 2. フィールド名の整合性チェック

### 2.1 企業基本情報フィールド

| フロントエンド | バックエンドZodスキーマ | Prismaスキーマ | 整合性 |
|--------------|----------------------|---------------|-------|
| `code` | `code: z.string().min(1).max(50)` | `code String @unique @db.VarChar(50)` | OK |
| `name` | `name: z.string().min(1).max(200)` | `name String @db.VarChar(200)` | OK |
| `nameKana` | `nameKana: z.string().max(200).optional().nullable()` | `nameKana String? @db.VarChar(200)` | OK |
| `industry` | `industry: z.string().max(100).optional().nullable()` | `industry String? @db.VarChar(100)` | OK |
| `status` | `status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED'])` | `status CompanyStatus @default(ACTIVE)` | OK |
| `website` | `website: z.string().max(500).optional().nullable()` | `website String? @db.VarChar(500)` | OK |
| `remark` | `remark: z.string().optional().nullable()` | `remark String? @db.Text` | OK |

### 2.2 拠点（offices）フィールド

| フロントエンド | バックエンドZodスキーマ | Prismaスキーマ | 整合性 |
|--------------|----------------------|---------------|-------|
| `name` | `name: z.string().min(1).max(200)` | `name String @db.VarChar(200)` | OK |
| `postalCode` | `postalCode: z.string().max(10).optional().nullable()` | `postalCode String? @db.VarChar(10)` | OK |
| `address` | `address: z.string().optional().nullable()` | `address String? @db.Text` | OK |
| `phone` | `phone: z.string().max(20).optional().nullable()` | `phone String? @db.VarChar(20)` | OK |
| `isHeadquarters` | `isHeadquarters: z.boolean().optional().default(false)` | `isHeadquarters Boolean @default(false)` | OK |

### 2.3 担当窓口（contacts）フィールド

| フロントエンド | バックエンドZodスキーマ | Prismaスキーマ | 整合性 |
|--------------|----------------------|---------------|-------|
| `name` | `name: z.string().min(1).max(100)` | `name String @db.VarChar(100)` | OK |
| `nameKana` | `nameKana: z.string().max(100).optional().nullable()` | `nameKana String? @db.VarChar(100)` | OK |
| `title` | `title: z.string().max(100).optional().nullable()` | `title String? @db.VarChar(100)` | OK |
| `email` | `email: z.string().email().max(255).optional().nullable()` | `email String? @db.VarChar(255)` | OK |
| `phone` | `phone: z.string().max(20).optional().nullable()` | `phone String? @db.VarChar(20)` | OK |
| `mobile` | `mobile: z.string().max(20).optional().nullable()` | `mobile String? @db.VarChar(20)` | OK |
| `isPrimary` | `isPrimary: z.boolean().optional().default(false)` | `isPrimary Boolean @default(false)` | OK |
| `remark` | `remark: z.string().optional().nullable()` | `remark String? @db.Text` | OK |

---

## 3. 型定義との整合性

### 3.1 Company型（types/index.ts）
**問題発見: `code` フィールドが欠落**

```typescript
// 現在の定義（types/index.ts）
export interface Company {
  id: string;
  name: string;
  nameKana?: string;
  industry?: string;
  status: CompanyStatus;
  website?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  offices?: CompanyOffice[];
  departments?: CompanyDepartment[];
  contacts?: CompanyContact[];
}
```

**問題点:**
- `code` フィールドがCompany型に定義されていない
- フロントエンドの `company.code` アクセスは型エラーになる可能性がある（TypeScriptのstrict設定次第）

### 3.2 CompanyOffice型
**問題発見: `isHeadquarters` の命名不一致**

```typescript
// 現在の定義（types/index.ts）
export interface CompanyOffice {
  id: string;
  companyId: string;
  name: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  isPrimary: boolean;  // ← isHeadquarters ではない
  sortOrder: number;
  createdAt: string;
}
```

**問題点:**
- フロントエンドのCompanyForm.tsxでは `isHeadquarters` を使用
- 型定義では `isPrimary` になっている
- バックエンド（Prisma）では `isHeadquarters` を使用

### 3.3 CompanyContact型
**問題発見: フィールド名の不一致**

```typescript
// 現在の定義（types/index.ts）
export interface CompanyContact {
  id: string;
  companyId: string;
  departmentId?: string;
  fullName: string;        // ← name ではない
  fullNameKana?: string;   // ← nameKana ではない
  position?: string;       // ← title ではない
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
  remark?: string;
  sortOrder: number;
  createdAt: string;
  department?: CompanyDepartment;
}
```

**問題点:**
- `fullName` vs `name` - フォームでは `name` を使用
- `fullNameKana` vs `nameKana` - フォームでは `nameKana` を使用
- `position` vs `title` - フォームでは `title` を使用

バックエンド（Prisma）では `name`, `nameKana`, `title` を使用しているため、フロントエンドの型定義が間違っている。

---

## 4. 必須フィールドのrequired属性チェック

### 4.1 基本情報
| フィールド | required属性 | バックエンド要件 | 整合性 |
|-----------|-------------|----------------|-------|
| 企業コード | `required` | `z.string().min(1)` 必須 | OK |
| 企業名 | `required` | `z.string().min(1)` 必須 | OK |
| 企業名（カナ） | なし | optional | OK |
| 業種 | なし | optional | OK |
| ステータス | なし（デフォルト有り） | optional（デフォルト有り） | OK |
| Webサイト | なし | optional | OK |
| 備考 | なし | optional | OK |

### 4.2 拠点情報
| フィールド | required属性 | バックエンド要件 | 整合性 |
|-----------|-------------|----------------|-------|
| 拠点名 | なし | `z.string().min(1)` 必須 | **不整合** |

**問題点:** 拠点名は必須フィールドだがrequired属性がない

### 4.3 担当窓口
| フィールド | required属性 | バックエンド要件 | 整合性 |
|-----------|-------------|----------------|-------|
| 氏名 | なし | `z.string().min(1)` 必須 | **不整合** |

**問題点:** 担当者氏名は必須フィールドだがrequired属性がない

---

## 5. エラーハンドリングの確認

### 5.1 現在の実装
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    if (isEdit) {
      await updateCompany.mutateAsync({ id: id!, data: formData });
    } else {
      await createCompany.mutateAsync(formData);
    }
    navigate('/companies');
  } catch (err) {
    console.error('Submit failed:', err);
  }
};
```

**問題点:**
- エラーが発生してもユーザーに通知されない（console.error のみ）
- バリデーションエラーの詳細がユーザーに表示されない
- 企業コード重複エラー（DUPLICATE_CODE）のハンドリングがない

---

## 6. API呼び出しの確認（useCompanies.ts）

### 6.1 useCompany（詳細取得）
**ステータス: 問題なし**

```typescript
export function useCompany(id: string | undefined) {
  return useQuery<Company>({
    queryKey: companyKeys.detail(id!),
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.companies.detail(id!));
      return response.data.data;
    },
    enabled: !!id,
  });
}
```
- `enabled: !!id` でIDがない場合はクエリを実行しない（新規登録時）

### 6.2 useCreateCompany / useUpdateCompany
**ステータス: 問題なし**

- 成功時にクエリキャッシュを無効化している
- レスポンスデータを適切に返している

---

## 7. 発見された問題のまとめ

### 7.1 重大度: 高
1. **型定義の不整合（Company型に `code` がない）**
   - 影響: 編集時に企業コードが正しく表示されない可能性

2. **型定義の不整合（CompanyOffice型の `isPrimary` vs `isHeadquarters`）**
   - 影響: TypeScriptの型チェックが機能しない、ランタイムエラーの可能性

3. **型定義の不整合（CompanyContact型のフィールド名）**
   - 影響: 編集時に担当窓口の情報が正しくマッピングされない

### 7.2 重大度: 中
4. **拠点名・担当者名の必須属性欠落**
   - 影響: ユーザーが空のまま送信し、バックエンドでバリデーションエラー

5. **エラーハンドリング不足**
   - 影響: ユーザーがエラーの原因を理解できない

### 7.3 重大度: 低
6. **departments の型定義不整合**
   - フロントエンド: `{ name: string; parentId?: string; }`
   - バックエンド: `type` フィールドが必須
   - 現状CompanyFormでは部署管理UIが実装されていないため影響なし

---

## 8. 修正案

### 8.1 Company型の修正（types/index.ts）

```typescript
/** 企業 */
export interface Company {
  id: string;
  code: string;  // 追加
  name: string;
  nameKana?: string;
  industry?: string;
  status: CompanyStatus;
  website?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
  offices?: CompanyOffice[];
  departments?: CompanyDepartment[];
  contacts?: CompanyContact[];
}
```

### 8.2 CompanyOffice型の修正（types/index.ts）

```typescript
/** 企業拠点 */
export interface CompanyOffice {
  id: string;
  companyId: string;
  name: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  isHeadquarters: boolean;  // isPrimary から変更
  sortOrder: number;
  createdAt: string;
}
```

### 8.3 CompanyContact型の修正（types/index.ts）

```typescript
/** 企業担当窓口 */
export interface CompanyContact {
  id: string;
  companyId: string;
  departmentId?: string;
  name: string;           // fullName から変更
  nameKana?: string;      // fullNameKana から変更
  title?: string;         // position から変更
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
  remark?: string;
  sortOrder: number;
  createdAt: string;
  department?: CompanyDepartment;
}
```

### 8.4 拠点名・担当者名のrequired属性追加（CompanyForm.tsx）

```typescript
// 拠点名
<input
  type="text"
  placeholder="拠点名 *"
  required  // 追加
  value={office.name}
  onChange={(e) => updateOffice(index, 'name', e.target.value)}
  className="..."
/>

// 担当者名
<input
  type="text"
  placeholder="氏名 *"
  required  // 追加
  value={contact.name}
  onChange={(e) => updateContact(index, 'name', e.target.value)}
  className="..."
/>
```

### 8.5 エラーハンドリングの改善（CompanyForm.tsx）

```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  try {
    if (isEdit) {
      await updateCompany.mutateAsync({ id: id!, data: formData });
    } else {
      await createCompany.mutateAsync(formData);
    }
    navigate('/companies');
  } catch (err: any) {
    console.error('Submit failed:', err);
    if (err.code === 'DUPLICATE_CODE') {
      setError('この企業コードは既に使用されています');
    } else if (err.message) {
      setError(err.message);
    } else {
      setError('保存に失敗しました');
    }
  }
};

// フォーム内にエラー表示を追加
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
    {error}
  </div>
)}
```

---

## 9. 結論

CompanyForm.tsx の基本的な実装は正しいが、**型定義（types/index.ts）とバックエンドAPIの間にフィールド名の不整合**が複数発見された。これらは編集モードで既存企業データを読み込む際に問題を引き起こす可能性がある。

### 推奨アクション
1. **即時対応**: types/index.tsの型定義を修正
2. **短期対応**: required属性の追加、エラーハンドリングの改善
3. **動作確認**: 修正後に新規登録・編集の両方をテスト

---

## 付録: 検証に使用したファイル一覧

- `C:\dev\EmployeeDB\frontend\src\pages\CompanyForm.tsx`
- `C:\dev\EmployeeDB\frontend\src\hooks\useCompanies.ts`
- `C:\dev\EmployeeDB\frontend\src\types\index.ts`
- `C:\dev\EmployeeDB\frontend\src\api\config.ts`
- `C:\dev\EmployeeDB\backend\src\routes\companies.ts`
- `C:\dev\EmployeeDB\backend\prisma\schema.prisma`

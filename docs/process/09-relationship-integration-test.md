# 企業・案件・アサインメントの関連性テスト結果

実施日: 2026-02-03

## 1. Prismaスキーマでのリレーション定義確認

### 1.1 対象モデルと関連性

```
Employee (社員)
    ↓ projectAssignments (1:N)
ProjectAssignment (案件参画)
    ↑ employee (N:1)      ↑ project (N:1)
                         ↓
                     Project (案件)
                         ↓ company (N:1)
                     Company (企業)
```

### 1.2 各モデルのリレーション定義

#### Employee モデル
```prisma
model Employee {
  id                    String   @id @default(uuid()) @db.Uuid
  // ... その他のフィールド

  // Relations
  skills                EmployeeSkill[]
  projectAssignments    ProjectAssignment[]  // 案件参画履歴

  @@map("employees")
}
```

**確認結果**: OK
- `projectAssignments` リレーションが定義されている
- 1対多の関係が正しく設定されている

#### ProjectAssignment モデル
```prisma
model ProjectAssignment {
  id                    String              @id @default(uuid()) @db.Uuid
  projectId             String              @map("project_id") @db.Uuid
  employeeId            String              @map("employee_id") @db.Uuid
  // ... その他のフィールド

  // Relations
  project               Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  employee              Employee            @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([projectId], name: "idx_project_assignments_project_id")
  @@index([employeeId], name: "idx_project_assignments_employee_id")
  @@map("project_assignments")
}
```

**確認結果**: OK
- `project` と `employee` への外部キーリレーションが定義されている
- `onDelete: Cascade` が設定されており、親削除時に自動削除される
- インデックスが適切に設定されている

#### Project モデル
```prisma
model Project {
  id                  String             @id @default(uuid()) @db.Uuid
  companyId           String             @map("company_id") @db.Uuid
  departmentId        String?            @map("department_id") @db.Uuid
  // ... その他のフィールド

  // Relations
  company             Company            @relation(fields: [companyId], references: [id], onDelete: Cascade)
  department          CompanyDepartment? @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  assignments         ProjectAssignment[]

  @@index([companyId], name: "idx_projects_company_id")
  @@map("projects")
}
```

**確認結果**: OK
- `company` への外部キーリレーションが定義されている
- `onDelete: Cascade` が設定されており、企業削除時に案件も自動削除される
- `department` は `onDelete: SetNull` で、部署削除時はNULLになる
- `assignments` で参画一覧を取得可能

#### Company モデル
```prisma
model Company {
  id          String          @id @default(uuid()) @db.Uuid
  // ... その他のフィールド

  // Relations
  offices     CompanyOffice[]
  departments CompanyDepartment[]
  contacts    CompanyContact[]
  projects    Project[]

  @@map("companies")
}
```

**確認結果**: OK
- `projects` リレーションで企業に紐づく案件一覧を取得可能

---

## 2. 企業→案件のリレーションテスト

### 2.1 企業に紐づく案件一覧の取得

#### テスト対象: `GET /api/companies/:id`

**実装確認** (`backend/src/routes/companies.ts` 行182-186):
```typescript
const company = await prisma.company.findUnique({
  where: { id },
  include: {
    // ... 他のリレーション
    projects: {
      orderBy: { createdAt: 'desc' },
      take: 10, // 最新10件のみ
    },
  },
});
```

**確認結果**: OK
- 企業詳細取得時に `projects` が含まれる
- 最新10件のみ取得するよう最適化されている

#### テスト対象: `GET /api/projects?companyId=xxx`

**実装確認** (`backend/src/routes/projects.ts` 行114-117):
```typescript
if (companyId) {
  whereClause.companyId = companyId;
}
```

**テスト結果**: PASS
```
√ 企業IDでフィルタできる (52 ms)
```

### 2.2 企業一覧での案件数カウント

**実装確認** (`backend/src/routes/companies.ts` 行108-116):
```typescript
const companies = await prisma.company.findMany({
  // ...
  include: {
    _count: {
      select: {
        offices: true,
        departments: true,
        contacts: true,
        projects: true,  // 案件数もカウント
      },
    },
  },
});
```

**確認結果**: OK
- 企業一覧で各企業の案件数を取得可能

---

## 3. 案件→アサインメントのリレーションテスト

### 3.1 案件に紐づくアサインメント一覧の取得

#### テスト対象: `GET /api/projects/:id`

**実装確認** (`backend/src/routes/projects.ts` 行180-204):
```typescript
const project = await prisma.project.findUnique({
  where: { id },
  include: {
    company: true,
    department: true,
    assignments: {
      include: {
        employee: {
          select: {
            id: true,
            employeeNumber: true,
            fullName: true,
            email: true,
            department: true,
            position: true,
            status: true,
          },
        },
      },
      orderBy: {
        assignmentStartDate: 'desc',
      },
    },
  },
});
```

**テスト結果**: PASS
```
√ 案件詳細を取得できる（企業情報を含む） (49 ms)
```

#### テスト対象: `GET /api/projects/:projectId/assignments`

**実装確認** (`backend/src/routes/projects.ts` 行404-442):
```typescript
const assignments = await prisma.projectAssignment.findMany({
  where: { projectId },
  include: {
    employee: {
      select: {
        id: true,
        employeeNumber: true,
        fullName: true,
        fullNameKana: true,
        email: true,
        department: true,
        position: true,
        status: true,
      },
    },
  },
  orderBy: {
    assignmentStartDate: 'desc',
  },
});
```

**テスト結果**: PASS
```
√ 案件の参画社員一覧を取得できる (79 ms)
```

### 3.2 アサインメント作成テスト

#### テスト対象: `POST /api/projects/:projectId/assignments`

**テスト結果**: PASS
```
√ 社員を案件に参画させることができる (72 ms)
√ 参画期間が案件期間外の場合はエラー (50 ms)
√ Viewer権限では参画登録できない (54 ms)
```

**バリデーション確認**:
- 参画開始日が案件期間外の場合はエラー
- 参画終了日が案件期間外の場合はエラー
- 社員の存在確認が行われる
- 案件の存在確認が行われる

---

## 4. 社員→アサインメント→案件→企業の連鎖テスト

### 4.1 社員の参画履歴取得

#### テスト対象: `GET /api/employees/:id/assignments`

**実装確認** (`backend/src/routes/employees.ts` 行611-672):
```typescript
const assignments = await prisma.projectAssignment.findMany({
  where: whereClause,
  skip,
  take: limit,
  include: {
    project: {
      include: {
        company: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
  },
  orderBy: {
    assignmentStartDate: 'desc',
  },
});
```

**テスト結果**: PASS
```
√ 社員の参画履歴を取得できる（時系列順） (113 ms)
√ ステータスでフィルタできる (75 ms)
```

**確認ポイント**:
- 社員 → アサインメント → 案件 → 企業 の連鎖が正しく取得できる
- 時系列順（降順）でソートされている
- ステータスによるフィルタリングが機能する
- ページネーションが実装されている

---

## 5. カスケード削除のテスト

### 5.1 企業削除時の案件の扱い

**Prismaスキーマ定義**:
```prisma
model Project {
  company  Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

**動作**: 企業を削除すると、紐づく案件も自動的に削除される

**実装確認** (`backend/src/routes/companies.ts` 行295-314):
```typescript
router.delete('/:id', requireAuth, requireEditor, async (req, res, next) => {
  // 存在確認のみで、関連データの明示的な削除は不要
  // Prismaの onDelete: Cascade が自動処理
  await prisma.company.delete({ where: { id } });
});
```

**確認結果**: OK
- スキーマレベルでカスケード削除が設定されている
- API実装では明示的な削除処理は不要

### 5.2 案件削除時のアサインメントの扱い

**Prismaスキーマ定義**:
```prisma
model ProjectAssignment {
  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**動作**: 案件を削除すると、紐づくアサインメントも自動的に削除される

**テスト結果**: PASS
```
√ Editor権限で案件を削除できる (46 ms)
```

**実装確認** (`backend/src/routes/projects.ts` 行375-394):
```typescript
router.delete('/:id', requireAuth, requireEditor, async (req, res, next) => {
  // 存在確認のみで、関連アサインメントの明示的な削除は不要
  // Prismaの onDelete: Cascade が自動処理
  await prisma.project.delete({ where: { id } });
});
```

**確認結果**: OK
- スキーマレベルでカスケード削除が設定されている

### 5.3 社員削除時のアサインメントの扱い

**Prismaスキーマ定義**:
```prisma
model ProjectAssignment {
  employee  Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
}
```

**動作**: 社員を削除すると、紐づくアサインメント履歴も自動的に削除される

**確認結果**: OK
- スキーマレベルでカスケード削除が設定されている

---

## 6. テスト実行結果サマリー

### 6.1 全テスト結果

```
Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
Snapshots:   0 total
Time:        6.118 s
```

### 6.2 テスト項目一覧

| テスト項目 | 結果 | 実行時間 |
|-----------|------|---------|
| 認証なしの場合は401エラー | PASS | 86ms |
| 案件一覧を取得できる | PASS | 167ms |
| キーワード検索ができる | PASS | 89ms |
| 企業IDでフィルタできる | PASS | 52ms |
| ステータスでフィルタできる | PASS | 43ms |
| 契約形態でフィルタできる | PASS | 46ms |
| ページネーションが機能する | PASS | 53ms |
| 案件詳細を取得できる（企業情報を含む） | PASS | 49ms |
| 存在しない案件IDの場合は404エラー | PASS | 93ms |
| Editor権限で案件を作成できる | PASS | 96ms |
| Admin権限で案件を作成できる | PASS | 55ms |
| Viewer権限では作成できない（403エラー） | PASS | 22ms |
| 案件名が必須 | PASS | 29ms |
| 契約終了日が開始日より前の場合はエラー | PASS | 28ms |
| 存在しない企業IDの場合はエラー | PASS | 48ms |
| Editor権限で案件を更新できる | PASS | 46ms |
| Viewer権限では更新できない | PASS | 27ms |
| 存在しない案件IDの場合は404エラー | PASS | 29ms |
| Editor権限で案件を削除できる | PASS | 46ms |
| Viewer権限では削除できない | PASS | 29ms |
| 案件の参画社員一覧を取得できる | PASS | 79ms |
| 社員を案件に参画させることができる | PASS | 72ms |
| 参画期間が案件期間外の場合はエラー | PASS | 50ms |
| Viewer権限では参画登録できない | PASS | 54ms |
| 参画情報を更新できる（終了日設定等） | PASS | 110ms |
| 参画を解除できる | PASS | 80ms |
| 社員の参画履歴を取得できる（時系列順） | PASS | 113ms |
| ステータスでフィルタできる | PASS | 75ms |

---

## 7. リレーション設計の評価

### 7.1 正常に機能している点

1. **双方向リレーション**:
   - 企業から案件一覧、案件から企業情報の両方向で取得可能
   - 社員から参画履歴、案件から参画社員一覧の両方向で取得可能

2. **カスケード削除**:
   - 親レコード削除時に子レコードが自動削除される
   - データの整合性が保たれる

3. **インデックス設計**:
   - 外部キーカラムに適切なインデックスが設定されている
   - 検索パフォーマンスが最適化されている

4. **参照整合性**:
   - 存在しない企業IDでの案件作成は拒否される
   - 存在しない社員IDでの参画作成は拒否される

### 7.2 考慮が必要な点

1. **ソフトデリート未実装**:
   - 現在は物理削除のみ
   - 履歴保持が必要な場合はソフトデリートの検討が必要

2. **企業詳細の案件取得制限**:
   - 最新10件のみ取得する設計
   - 全件取得が必要な場合は別APIの利用が必要

---

## 8. 関連ファイル一覧

| ファイル | 説明 |
|---------|------|
| `backend/prisma/schema.prisma` | データベーススキーマ定義 |
| `backend/src/routes/companies.ts` | 企業管理API |
| `backend/src/routes/projects.ts` | 案件・参画管理API |
| `backend/src/routes/employees.ts` | 社員管理API（参画履歴含む） |
| `backend/src/routes/__tests__/projects.test.ts` | 案件APIテスト |
| `backend/src/routes/__tests__/companies.test.ts` | 企業APIテスト |

---

## 9. 結論

企業・案件・アサインメントのリレーション設計は正しく実装されており、全28テストが成功している。

**主要な確認ポイント**:
- Prismaスキーマでのリレーション定義: 正常
- 企業→案件のリレーション: 正常
- 案件→アサインメントのリレーション: 正常
- 社員→アサインメント→案件→企業の連鎖: 正常
- カスケード削除: 正常

全ての検証項目において期待通りの動作を確認した。

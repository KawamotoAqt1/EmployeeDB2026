# 社員データインポートガイド

## 概要

`employee.csv` から社員データベースへデータをインポートする手順を説明します。

---

## CSVファイル仕様

### ファイル情報
- **ファイル名**: `employee.csv`
- **文字コード**: UTF-8 (BOM付き)
- **区切り文字**: カンマ (,)

### カラム一覧

| # | CSVカラム | DBカラム | 型 | 変換 |
|---|----------|----------|-----|------|
| 1 | FullName | fullName | VARCHAR(100) | そのまま |
| 2 | EmployeeNumber | employeeNumber | VARCHAR(20) | そのまま |
| 3 | FullNameKana | fullNameKana | VARCHAR(100) | そのまま |
| 4 | ContractType | contractType | ENUM | 要変換 |
| 5 | BirthDate | birthDate | DATE | YYYY/M/D → DATE |
| 6 | Gender | gender | ENUM | 要変換 |
| 7 | Department | department | VARCHAR(100) | そのまま |
| 8 | Position | position | VARCHAR(100) | そのまま |
| 9 | Location | location | VARCHAR(100) | そのまま |
| 10 | Residence | residence | VARCHAR(100) | そのまま |
| 11 | Country | country | VARCHAR(50) | そのまま |
| 12 | Email | email | VARCHAR(255) | #N/A → null |
| 13 | HireDate | hireDate | DATE | YYYY/M/D → DATE |
| 14 | ContractEndDate | contractEndDate | DATE | YYYY/M/D → DATE |
| 15 | Skills | - | - | タグとして別途処理 |
| 16 | Status | status | ENUM | 要変換 |
| 17 | Assigned | remark | TEXT | 備考に統合 |
| 18 | Remark | remark | TEXT | 備考に統合 |
| 19 | Photo | photoUrl | VARCHAR(500) | 要変換 |
| 20 | station | station | VARCHAR(100) | そのまま |
| 21 | アイテムの種類 | - | - | 無視 |
| 22 | パス | - | - | 無視 |

---

## データ変換ルール

### 1. ContractType（契約形態）

| CSV値 | DB値 |
|-------|------|
| 正社員 | FULL_TIME |
| 契約社員 | CONTRACT |
| BP | OUTSOURCE |
| パート | PART_TIME |
| 派遣 | TEMPORARY |
| インターン | INTERN |

### 2. Gender（性別）

| CSV値 | DB値 |
|-------|------|
| 男性 | MALE |
| 女性 | FEMALE |
| その他 / 設定なし | OTHER |

### 3. Status（ステータス）

| CSV値 | DB値 |
|-------|------|
| 在籍 | ACTIVE |
| 休職 / 休職中 | INACTIVE |
| 退職 | RESIGNED |
| 入社予定 | PENDING |

### 4. 日付

- 形式: `YYYY/M/D` → `YYYY-MM-DD`
- 空欄: `null`
- 例: `2008/2/6` → `2008-02-06`

### 5. Email

- `#N/A` → `null`
- 空欄 → `null`

### 6. Skills（スキルタグ）

CSVの `Skills` カラムは読点（、）区切りの文字列です。

```
C#、VBA、C++、PHP、ASP
評価設計/実施、RPA、要件定義
```

**処理方法**:
1. 読点（、）で分割
2. 各スキルをタグマスタから検索
3. 存在しなければ新規タグ作成
4. `employee_skills` テーブルに紐付け

---

## インポートスクリプト

### 方法1: Node.jsスクリプト

`backend/scripts/import-employees.ts` を作成:

```typescript
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { prisma } from '../src/lib/prisma';

const CSV_PATH = 'docs/import/employee.csv';

// 変換マップ
const contractTypeMap: Record<string, string> = {
  '正社員': 'FULL_TIME',
  '契約社員': 'CONTRACT',
  'BP': 'OUTSOURCE',
  'パート': 'PART_TIME',
  '派遣': 'TEMPORARY',
};

const genderMap: Record<string, string> = {
  '男性': 'MALE',
  '女性': 'FEMALE',
};

const statusMap: Record<string, string> = {
  '在籍': 'ACTIVE',
  '休職': 'INACTIVE',
  '休職中': 'INACTIVE',
  '退職': 'RESIGNED',
  '入社予定': 'PENDING',
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === '#N/A') return null;
  const [year, month, day] = dateStr.split('/').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function cleanValue(val: string): string | null {
  if (!val || val === '#N/A') return null;
  return val.trim();
}

async function importEmployees() {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  console.log(`Importing ${records.length} employees...`);

  for (const row of records) {
    try {
      // 社員データ作成
      const employee = await prisma.employee.upsert({
        where: { employeeNumber: row.EmployeeNumber },
        create: {
          employeeNumber: row.EmployeeNumber,
          fullName: row.FullName,
          fullNameKana: cleanValue(row.FullNameKana),
          email: cleanValue(row.Email),
          birthDate: parseDate(row.BirthDate),
          gender: genderMap[row.Gender] || null,
          contractType: contractTypeMap[row.ContractType] || null,
          department: cleanValue(row.Department),
          position: cleanValue(row.Position),
          location: cleanValue(row.Location),
          residence: cleanValue(row.Residence),
          country: cleanValue(row.Country),
          station: cleanValue(row.station),
          hireDate: parseDate(row.HireDate),
          contractEndDate: parseDate(row.ContractEndDate),
          status: statusMap[row.Status] || 'ACTIVE',
          remark: [row.Assigned, row.Remark].filter(Boolean).join('\n') || null,
        },
        update: {
          fullName: row.FullName,
          fullNameKana: cleanValue(row.FullNameKana),
          // ... 他のフィールドも同様
        },
      });

      console.log(`✓ ${employee.employeeNumber}: ${employee.fullName}`);

      // スキルタグの処理
      if (row.Skills) {
        const skills = row.Skills.split('、').map((s: string) => s.trim()).filter(Boolean);
        for (const skillName of skills) {
          // タグを取得または作成
          let tag = await prisma.tag.findFirst({
            where: { name: skillName },
          });

          if (!tag) {
            // デフォルトカテゴリ（TECH）を取得
            const category = await prisma.tagCategory.findFirst({
              where: { code: 'TECH' },
            });
            if (category) {
              tag = await prisma.tag.create({
                data: {
                  name: skillName,
                  categoryId: category.id,
                },
              });
            }
          }

          if (tag) {
            await prisma.employeeSkill.upsert({
              where: {
                employeeId_tagId: {
                  employeeId: employee.id,
                  tagId: tag.id,
                },
              },
              create: {
                employeeId: employee.id,
                tagId: tag.id,
                level: 'INTERMEDIATE',
              },
              update: {},
            });
          }
        }
      }
    } catch (error) {
      console.error(`✗ ${row.EmployeeNumber}: ${error}`);
    }
  }

  console.log('Import completed!');
}

importEmployees()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 実行方法

```bash
cd backend
npx ts-node scripts/import-employees.ts
```

---

## 方法2: SQLで直接インポート

### Step 1: 一時テーブル作成

```sql
CREATE TEMP TABLE temp_employees (
  full_name VARCHAR(100),
  employee_number VARCHAR(20),
  full_name_kana VARCHAR(100),
  contract_type VARCHAR(20),
  birth_date VARCHAR(20),
  gender VARCHAR(10),
  department VARCHAR(100),
  position VARCHAR(100),
  location VARCHAR(100),
  residence VARCHAR(100),
  country VARCHAR(50),
  email VARCHAR(255),
  hire_date VARCHAR(20),
  contract_end_date VARCHAR(20),
  skills TEXT,
  status VARCHAR(20),
  assigned TEXT,
  remark TEXT,
  photo TEXT,
  station VARCHAR(100)
);
```

### Step 2: CSVインポート

```sql
\copy temp_employees FROM 'employee.csv' WITH (FORMAT csv, HEADER true, ENCODING 'UTF8');
```

### Step 3: データ変換・挿入

```sql
INSERT INTO employees (
  id, employee_number, full_name, full_name_kana,
  email, birth_date, gender, contract_type,
  department, position, location, residence,
  country, station, hire_date, contract_end_date,
  status, remark, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  employee_number,
  full_name,
  NULLIF(full_name_kana, ''),
  NULLIF(NULLIF(email, ''), '#N/A'),
  NULLIF(birth_date, '')::DATE,
  CASE gender
    WHEN '男性' THEN 'MALE'
    WHEN '女性' THEN 'FEMALE'
    ELSE NULL
  END,
  CASE contract_type
    WHEN '正社員' THEN 'FULL_TIME'
    WHEN '契約社員' THEN 'CONTRACT'
    WHEN 'BP' THEN 'OUTSOURCE'
    ELSE NULL
  END,
  NULLIF(department, ''),
  NULLIF(position, ''),
  NULLIF(location, ''),
  NULLIF(NULLIF(residence, ''), '#N/A'),
  NULLIF(country, ''),
  NULLIF(station, ''),
  NULLIF(hire_date, '')::DATE,
  NULLIF(contract_end_date, '')::DATE,
  CASE status
    WHEN '在籍' THEN 'ACTIVE'
    WHEN '休職' THEN 'INACTIVE'
    WHEN '退職' THEN 'RESIGNED'
    ELSE 'ACTIVE'
  END,
  CONCAT_WS(E'\n', NULLIF(assigned, ''), NULLIF(remark, '')),
  NOW(),
  NOW()
FROM temp_employees
ON CONFLICT (employee_number) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = NOW();
```

---

## 注意事項

1. **重複チェック**: `employeeNumber` をキーとして重複を検出
2. **文字化け対策**: UTF-8 (BOM付き) で保存されていることを確認
3. **日付形式**: `YYYY/M/D` 形式であること
4. **#N/A値**: Excel由来の `#N/A` は null に変換
5. **スキルタグ**: 事前にタグカテゴリ（TECH等）を作成しておく

---

## 事前準備チェックリスト

- [ ] PostgreSQLが起動している
- [ ] データベースが作成されている
- [ ] マイグレーションが適用されている
- [ ] タグカテゴリ（TECH, PROC等）が作成されている
- [ ] CSVファイルがUTF-8で保存されている

---

## トラブルシューティング

### エラー: 文字化け
→ CSVをUTF-8 (BOM付き) で保存し直す

### エラー: 日付パースエラー
→ 日付形式が `YYYY/M/D` であることを確認

### エラー: 重複キー
→ `employeeNumber` が重複している行を確認

### エラー: タグカテゴリが見つからない
→ 先にタグカテゴリを作成:
```sql
INSERT INTO tag_categories (id, code, name, sort_order, created_at)
VALUES (gen_random_uuid(), 'TECH', '技術スキル', 0, NOW());
```

/**
 * 社員データ CSV インポートスクリプト
 * docs/import/import-guide.md に準拠
 * 実行: cd backend && npx ts-node scripts/import-employees-csv.ts
 */
import 'dotenv/config';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CSV_PATH = path.join(__dirname, '../../docs/import/employee.csv');

// 変換マップ（import-guide.md 準拠）
const contractTypeMap: Record<string, string> = {
  '正社員': 'FULL_TIME',
  '契約社員': 'CONTRACT',
  'BP': 'OUTSOURCE',
  'パート': 'PART_TIME',
  '派遣': 'TEMPORARY',
  'インターン': 'INTERN',
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

function parseDate(dateStr: string | undefined): Date | null {
  const s = cleanValue(dateStr);
  if (!s) return null;
  const parts = s.split('/').map(Number);
  if (parts.length < 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  return isNaN(date.getTime()) ? null : date;
}

function cleanValue(val: string | undefined): string | null {
  if (val === undefined || val === null) return null;
  const t = val.trim();
  if (t === '' || t === '#N/A') return null;
  return t;
}

function extractPhotoUrl(photoJson: string | undefined): string | null {
  const s = cleanValue(photoJson);
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    return parsed.fileName || parsed.originalImageName || null;
  } catch {
    return null;
  }
}

function parseSkills(skillsStr: string | undefined): string[] {
  const s = cleanValue(skillsStr);
  if (!s) return [];
  return s
    .split(/[、,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

interface CsvRow {
  FullName?: string;
  EmployeeNumber?: string;
  FullNameKana?: string;
  ContractType?: string;
  BirthDate?: string;
  Gender?: string;
  Department?: string;
  Position?: string;
  Location?: string;
  Residence?: string;
  Country?: string;
  Email?: string;
  HireDate?: string;
  ContractEndDate?: string;
  Skills?: string;
  Status?: string;
  Assigned?: string;
  Remark?: string;
  Photo?: string;
  station?: string;
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const records: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
  });

  console.log(`Importing ${records.length} employees from employee.csv...`);

  // シードは TECH_LANG / TECH_CAD / PROC を使用。スキル用に TECH_LANG を優先
  let techCategory = await prisma.tagCategory.findFirst({
    where: { code: 'TECH_LANG' },
  });
  if (!techCategory) {
    techCategory = await prisma.tagCategory.findFirst({
      where: { code: { in: ['TECH_LANG', 'TECH_CAD', 'TECH', 'PROC'] } },
    });
  }
  if (!techCategory) {
    techCategory = await prisma.tagCategory.findFirst();
  }
  if (!techCategory) {
    console.error('Tag category not found. Run prisma:seed first.');
    process.exit(1);
  }
  console.log(`Using tag category: ${techCategory.code} (${techCategory.name})`);

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const row of records) {
    try {
      const empNo = cleanValue(row.EmployeeNumber);
      const fullName = cleanValue(row.FullName);
      if (!empNo || !fullName) {
        console.log('Skipping row: missing EmployeeNumber or FullName');
        continue;
      }

      let email = cleanValue(row.Email);
      if (email) {
        const existingByEmail = await prisma.employee.findUnique({
          where: { email },
        });
        if (existingByEmail && existingByEmail.employeeNumber !== empNo) {
          email = null;
        }
      }

      const remarkParts = [cleanValue(row.Assigned), cleanValue(row.Remark)].filter(Boolean);
      const remark = remarkParts.length > 0 ? remarkParts.join('\n') : null;

      const status = (row.Status && statusMap[row.Status.trim()]) || 'ACTIVE';
      const contractType = row.ContractType ? contractTypeMap[row.ContractType.trim()] ?? null : null;
      const gender = row.Gender ? (genderMap[row.Gender.trim()] ?? 'OTHER') : null;

      const existingBefore = await prisma.employee.findUnique({
        where: { employeeNumber: empNo },
      });

      const employee = await prisma.employee.upsert({
        where: { employeeNumber: empNo },
        create: {
          employeeNumber: empNo,
          fullName: fullName,
          fullNameKana: cleanValue(row.FullNameKana),
          email,
          birthDate: parseDate(row.BirthDate),
          gender: gender as 'MALE' | 'FEMALE' | 'OTHER' | null,
          contractType: contractType as any,
          department: cleanValue(row.Department),
          position: cleanValue(row.Position),
          location: cleanValue(row.Location),
          residence: cleanValue(row.Residence),
          country: cleanValue(row.Country),
          station: cleanValue(row.station),
          hireDate: parseDate(row.HireDate),
          contractEndDate: parseDate(row.ContractEndDate),
          status: status as any,
          remark,
          photoUrl: extractPhotoUrl(row.Photo),
        },
        update: {
          fullName: fullName,
          fullNameKana: cleanValue(row.FullNameKana),
          email,
          birthDate: parseDate(row.BirthDate),
          gender: gender as 'MALE' | 'FEMALE' | 'OTHER' | null,
          contractType: contractType as any,
          department: cleanValue(row.Department),
          position: cleanValue(row.Position),
          location: cleanValue(row.Location),
          residence: cleanValue(row.Residence),
          country: cleanValue(row.Country),
          station: cleanValue(row.station),
          hireDate: parseDate(row.HireDate),
          contractEndDate: parseDate(row.ContractEndDate),
          status: status as any,
          remark,
          photoUrl: extractPhotoUrl(row.Photo),
        },
      });

      if (existingBefore) updated++;
      else imported++;

      // スキルタグ
      const skills = parseSkills(row.Skills);
      for (const skillName of skills) {
        let tag = await prisma.tag.findFirst({
          where: { name: skillName, categoryId: techCategory!.id },
        });
        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              name: skillName,
              categoryId: techCategory!.id,
              sortOrder: 0,
            },
          });
        }
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

      console.log(`✓ ${employee.employeeNumber}: ${employee.fullName}`);
    } catch (err) {
      console.error(`✗ ${row.EmployeeNumber}:`, err);
      errors++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total rows: ${records.length}`);
  console.log(`Created: ${imported}`);
  console.log(`Updated: ${updated}`);
  console.log(`Errors: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

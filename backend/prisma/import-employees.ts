import { PrismaClient, Gender, ContractType, EmployeeStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExcelEmployee {
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

// Excel serial date to JavaScript Date
function excelDateToJSDate(serial: string | number | undefined): Date | null {
  if (!serial) return null;
  const num = typeof serial === 'string' ? parseInt(serial, 10) : serial;
  if (isNaN(num)) return null;
  // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as leap year
  const excelEpoch = new Date(1899, 11, 30);
  const jsDate = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
  return jsDate;
}

// Map contract type
function mapContractType(value: string | undefined): ContractType | null {
  if (!value) return null;
  const map: Record<string, ContractType> = {
    '正社員': 'FULL_TIME',
    '契約社員': 'CONTRACT',
    'BP': 'OUTSOURCE',
    'パート': 'PART_TIME',
    '派遣': 'TEMPORARY',
    'インターン': 'INTERN',
    '業務委託': 'OUTSOURCE',
  };
  return map[value] || null;
}

// Map gender
function mapGender(value: string | undefined): Gender | null {
  if (!value) return null;
  const map: Record<string, Gender> = {
    '男性': 'MALE',
    '女性': 'FEMALE',
    '男': 'MALE',
    '女': 'FEMALE',
  };
  return map[value] || 'OTHER';
}

// Map status
function mapStatus(value: string | undefined): EmployeeStatus {
  if (!value) return 'ACTIVE';
  const map: Record<string, EmployeeStatus> = {
    '在籍': 'ACTIVE',
    '在籍中': 'ACTIVE',
    '休職': 'INACTIVE',
    '休職中': 'INACTIVE',
    '退職': 'RESIGNED',
    '退職済': 'RESIGNED',
    '退職（求職）': 'RESIGNED',
    '入社予定': 'PENDING',
  };
  return map[value] || 'ACTIVE';
}

// Extract photo filename from JSON
function extractPhotoUrl(photoJson: string | undefined): string | null {
  if (!photoJson) return null;
  try {
    const parsed = JSON.parse(photoJson);
    return parsed.fileName || parsed.originalImageName || null;
  } catch {
    return null;
  }
}

// Parse skills string to array
function parseSkills(skillsStr: string | undefined): string[] {
  if (!skillsStr) return [];
  // Split by common delimiters
  return skillsStr
    .split(/[、,，・\/\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

async function main() {
  console.log('Starting employee import...');

  // Load JSON data
  const jsonPath = path.join(__dirname, '../../docs/import/employees.json');
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  const employees: ExcelEmployee[] = JSON.parse(rawData);

  console.log(`Found ${employees.length} employees to import`);

  // Get or create TECH category for skills
  let techCategory = await prisma.tagCategory.findUnique({
    where: { code: 'TECH' }
  });

  if (!techCategory) {
    techCategory = await prisma.tagCategory.create({
      data: {
        code: 'TECH',
        name: '技術スキル',
        sortOrder: 1,
      }
    });
    console.log('Created TECH category');
  }

  // Collect all unique skills
  const allSkills = new Set<string>();
  for (const emp of employees) {
    const skills = parseSkills(emp.Skills);
    skills.forEach(s => allSkills.add(s));
  }

  console.log(`Found ${allSkills.size} unique skills`);

  // Create tags for all skills
  const tagMap = new Map<string, string>(); // skill name -> tag id

  for (const skillName of allSkills) {
    let tag = await prisma.tag.findFirst({
      where: {
        categoryId: techCategory.id,
        name: skillName,
      }
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: {
          categoryId: techCategory.id,
          name: skillName,
          sortOrder: 0,
        }
      });
    }
    tagMap.set(skillName, tag.id);
  }

  console.log(`Created/found ${tagMap.size} tags`);

  // Import employees
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const emp of employees) {
    try {
      if (!emp.EmployeeNumber || !emp.FullName) {
        console.log(`Skipping employee without number or name`);
        skipped++;
        continue;
      }

      // Check if employee already exists
      const existing = await prisma.employee.findUnique({
        where: { employeeNumber: emp.EmployeeNumber }
      });

      if (existing) {
        console.log(`Skipping existing employee: ${emp.EmployeeNumber} ${emp.FullName}`);
        skipped++;
        continue;
      }

      // Handle duplicate emails
      let email = emp.Email || null;
      if (email) {
        const emailExists = await prisma.employee.findUnique({
          where: { email }
        });
        if (emailExists) {
          console.log(`Email ${email} already exists, setting to null for ${emp.EmployeeNumber}`);
          email = null;
        }
      }

      // Create employee
      const employee = await prisma.employee.create({
        data: {
          employeeNumber: emp.EmployeeNumber,
          fullName: emp.FullName,
          fullNameKana: emp.FullNameKana || null,
          email: email,
          birthDate: excelDateToJSDate(emp.BirthDate),
          gender: mapGender(emp.Gender),
          contractType: mapContractType(emp.ContractType),
          department: emp.Department || null,
          position: emp.Position || null,
          location: emp.Location || null,
          country: emp.Country || null,
          residence: emp.Residence || null,
          station: emp.station || null,
          hireDate: excelDateToJSDate(emp.HireDate),
          contractEndDate: excelDateToJSDate(emp.ContractEndDate),
          status: mapStatus(emp.Status),
          remark: emp.Remark || null,
          photoUrl: extractPhotoUrl(emp.Photo),
        }
      });

      // Add skills
      const skills = parseSkills(emp.Skills);
      for (const skillName of skills) {
        const tagId = tagMap.get(skillName);
        if (tagId) {
          await prisma.employeeSkill.create({
            data: {
              employeeId: employee.id,
              tagId: tagId,
              level: 'INTERMEDIATE', // Default level
            }
          });
        }
      }

      imported++;
      console.log(`Imported: ${emp.EmployeeNumber} ${emp.FullName}`);
    } catch (err) {
      console.error(`Error importing ${emp.EmployeeNumber} ${emp.FullName}:`, err);
      errors++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total: ${employees.length}`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

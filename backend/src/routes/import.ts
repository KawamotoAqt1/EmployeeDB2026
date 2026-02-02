import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, EmployeeStatus, Gender, ContractType } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// CSVデータのスキーマ
const csvRowSchema = z.object({
  employeeNumber: z.string().min(1).max(20),
  employeeUniqueNumber: z.string().max(50).optional().nullable(),
  fullName: z.string().min(1).max(100),
  fullNameKana: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable().or(z.literal('')),
  contractType: z.enum(['FULL_TIME', 'CONTRACT', 'PART_TIME', 'TEMPORARY', 'INTERN', 'OUTSOURCE']).optional().nullable().or(z.literal('')),
  department: z.string().max(100).optional().nullable(),
  position: z.string().max(100).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
  residence: z.string().max(100).optional().nullable(),
  station: z.string().max(100).optional().nullable(),
  hireDate: z.string().optional().nullable(),
  contractEndDate: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RESIGNED', 'PENDING']).optional().nullable().or(z.literal('')),
  remark: z.string().optional().nullable(),
  photoUrl: z.string().max(500).optional().nullable(),
});

// プレビューリクエストスキーマ
const previewRequestSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  headerMapping: z.record(z.string(), z.string()).optional(),
});

// インポートリクエストスキーマ
const importRequestSchema = z.object({
  data: z.array(z.record(z.string(), z.unknown())),
  headerMapping: z.record(z.string(), z.string()).optional(),
  updateExisting: z.boolean().optional().default(false),
});

// 日本語ヘッダーマッピング
const defaultHeaderMapping: Record<string, string> = {
  '社員番号': 'employeeNumber',
  '社員固有番号': 'employeeUniqueNumber',
  '氏名': 'fullName',
  '氏名（カナ）': 'fullNameKana',
  'メールアドレス': 'email',
  '生年月日': 'birthDate',
  '性別': 'gender',
  '契約形態': 'contractType',
  '部署': 'department',
  '役職': 'position',
  '勤務地': 'location',
  '国': 'country',
  '居住地': 'residence',
  '最寄り駅': 'station',
  '入社日': 'hireDate',
  '契約終了日': 'contractEndDate',
  'ステータス': 'status',
  '備考': 'remark',
  '写真URL': 'photoUrl',
};

// 性別マッピング
const genderMapping: Record<string, Gender> = {
  '男性': 'MALE',
  '男': 'MALE',
  'MALE': 'MALE',
  'M': 'MALE',
  '女性': 'FEMALE',
  '女': 'FEMALE',
  'FEMALE': 'FEMALE',
  'F': 'FEMALE',
  'その他': 'OTHER',
  'OTHER': 'OTHER',
};

// 契約形態マッピング
const contractTypeMapping: Record<string, ContractType> = {
  '正社員': 'FULL_TIME',
  'FULL_TIME': 'FULL_TIME',
  '契約社員': 'CONTRACT',
  'CONTRACT': 'CONTRACT',
  'パートタイム': 'PART_TIME',
  'PART_TIME': 'PART_TIME',
  '派遣社員': 'TEMPORARY',
  'TEMPORARY': 'TEMPORARY',
  'インターン': 'INTERN',
  'INTERN': 'INTERN',
  '業務委託': 'OUTSOURCE',
  'OUTSOURCE': 'OUTSOURCE',
};

// ステータスマッピング
const statusMapping: Record<string, EmployeeStatus> = {
  '在籍中': 'ACTIVE',
  'ACTIVE': 'ACTIVE',
  '休職中': 'INACTIVE',
  'INACTIVE': 'INACTIVE',
  '退職済': 'RESIGNED',
  'RESIGNED': 'RESIGNED',
  '入社予定': 'PENDING',
  'PENDING': 'PENDING',
};

/**
 * CSVデータを内部形式に変換
 */
function transformCsvRow(
  row: Record<string, unknown>,
  headerMapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const mappedKey = headerMapping[key] || key;
    let mappedValue = value;

    // 空文字列をnullに変換
    if (mappedValue === '') {
      mappedValue = null;
    }

    // 性別のマッピング
    if (mappedKey === 'gender' && typeof mappedValue === 'string') {
      mappedValue = genderMapping[mappedValue] || mappedValue;
    }

    // 契約形態のマッピング
    if (mappedKey === 'contractType' && typeof mappedValue === 'string') {
      mappedValue = contractTypeMapping[mappedValue] || mappedValue;
    }

    // ステータスのマッピング
    if (mappedKey === 'status' && typeof mappedValue === 'string') {
      mappedValue = statusMapping[mappedValue] || mappedValue;
    }

    result[mappedKey] = mappedValue;
  }

  return result;
}

/**
 * 行データのバリデーション
 */
function validateRow(row: Record<string, unknown>, rowIndex: number): {
  valid: boolean;
  data?: z.infer<typeof csvRowSchema>;
  errors?: string[];
} {
  try {
    const data = csvRowSchema.parse(row);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `行${rowIndex + 1}: ${e.path.join('.')} - ${e.message}`);
      return { valid: false, errors };
    }
    return { valid: false, errors: [`行${rowIndex + 1}: 不明なエラー`] };
  }
}

/**
 * POST /api/import/preview
 * CSVプレビュー（admin）
 */
router.post('/preview', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, headerMapping = defaultHeaderMapping } = previewRequestSchema.parse(req.body);

    const validRows: Array<{
      rowIndex: number;
      data: z.infer<typeof csvRowSchema>;
      exists: boolean;
    }> = [];
    const invalidRows: Array<{
      rowIndex: number;
      errors: string[];
      rawData: Record<string, unknown>;
    }> = [];

    // 既存の社員番号を取得
    const existingEmployees = await prisma.employee.findMany({
      select: { employeeNumber: true },
    });
    const existingNumbers = new Set(existingEmployees.map((e) => e.employeeNumber));

    // 各行を検証
    for (let i = 0; i < data.length; i++) {
      const rawRow = data[i] as Record<string, unknown>;
      if (!rawRow) continue;

      const transformedRow = transformCsvRow(rawRow, headerMapping);
      const validation = validateRow(transformedRow, i);

      if (validation.valid && validation.data) {
        validRows.push({
          rowIndex: i,
          data: validation.data,
          exists: existingNumbers.has(validation.data.employeeNumber),
        });
      } else {
        invalidRows.push({
          rowIndex: i,
          errors: validation.errors || ['バリデーションエラー'],
          rawData: rawRow,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        totalRows: data.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        newCount: validRows.filter((r) => !r.exists).length,
        updateCount: validRows.filter((r) => r.exists).length,
        validRows,
        invalidRows,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/import/employees
 * CSVインポート実行（admin）
 */
router.post('/employees', requireAuth, requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, headerMapping = defaultHeaderMapping, updateExisting } = importRequestSchema.parse(req.body);

    const results: {
      created: string[];
      updated: string[];
      skipped: string[];
      errors: Array<{ rowIndex: number; employeeNumber: string; error: string }>;
    } = {
      created: [],
      updated: [],
      skipped: [],
      errors: [],
    };

    // トランザクションで実行
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < data.length; i++) {
        const rawRow = data[i] as Record<string, unknown>;
        if (!rawRow) continue;

        const transformedRow = transformCsvRow(rawRow, headerMapping);
        const validation = validateRow(transformedRow, i);

        if (!validation.valid || !validation.data) {
          results.errors.push({
            rowIndex: i,
            employeeNumber: String(transformedRow.employeeNumber || '不明'),
            error: validation.errors?.join(', ') || 'バリデーションエラー',
          });
          continue;
        }

        const rowData = validation.data;

        try {
          // 既存の社員を検索
          const existing = await tx.employee.findUnique({
            where: { employeeNumber: rowData.employeeNumber },
          });

          // 日付フィールドの変換
          const employeeData: Prisma.EmployeeCreateInput = {
            employeeNumber: rowData.employeeNumber,
            employeeUniqueNumber: rowData.employeeUniqueNumber || null,
            fullName: rowData.fullName,
            fullNameKana: rowData.fullNameKana || null,
            email: rowData.email || null,
            birthDate: rowData.birthDate ? new Date(rowData.birthDate) : null,
            gender: (rowData.gender as Gender) || null,
            contractType: (rowData.contractType as ContractType) || null,
            department: rowData.department || null,
            position: rowData.position || null,
            location: rowData.location || null,
            country: rowData.country || null,
            residence: rowData.residence || null,
            station: rowData.station || null,
            hireDate: rowData.hireDate ? new Date(rowData.hireDate) : null,
            contractEndDate: rowData.contractEndDate ? new Date(rowData.contractEndDate) : null,
            status: (rowData.status as EmployeeStatus) || 'ACTIVE',
            remark: rowData.remark || null,
            photoUrl: rowData.photoUrl || null,
          };

          if (existing) {
            if (updateExisting) {
              // 既存データを更新
              await tx.employee.update({
                where: { employeeNumber: rowData.employeeNumber },
                data: employeeData,
              });
              results.updated.push(rowData.employeeNumber);
            } else {
              // スキップ
              results.skipped.push(rowData.employeeNumber);
            }
          } else {
            // 新規作成
            await tx.employee.create({
              data: employeeData,
            });
            results.created.push(rowData.employeeNumber);
          }
        } catch (dbError) {
          const errorMessage = dbError instanceof Error ? dbError.message : '不明なエラー';
          results.errors.push({
            rowIndex: i,
            employeeNumber: rowData.employeeNumber,
            error: errorMessage,
          });
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalProcessed: data.length,
        createdCount: results.created.length,
        updatedCount: results.updated.length,
        skippedCount: results.skipped.length,
        errorCount: results.errors.length,
        created: results.created,
        updated: results.updated,
        skipped: results.skipped,
        errors: results.errors,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

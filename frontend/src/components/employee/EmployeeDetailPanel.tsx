import { useMemo } from 'react';
import { Button, Badge, SkillBadge } from '@/components/ui';
import { API_BASE_URL } from '@/api/config';
import type { Employee, EmployeeSkill, ContractType, Gender, EmployeeStatus } from '@/types';
import { ContractTypeLabels, GenderLabels, EmployeeStatusLabels } from '@/types';

export interface EmployeeDetailPanelProps {
  /** 表示する社員データ */
  employee: Employee | null;
  /** 編集ボタン押下時のコールバック */
  onEdit: () => void;
  /** 削除ボタン押下時のコールバック */
  onDelete: () => void;
  /** 編集権限があるかどうか */
  canEdit: boolean;
}

/**
 * 写真のURLを取得
 */
function getPhotoUrl(photoUrl: string | undefined): string | undefined {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http')) return photoUrl;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${photoUrl}`;
}

/**
 * 年齢を計算
 */
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * 勤続年数を計算
 */
function calculateYearsOfService(hireDate: string): string {
  const today = new Date();
  const hire = new Date(hireDate);
  const diffMs = today.getTime() - hire.getTime();
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

  const years = Math.floor(diffYears);
  const months = Math.floor((diffYears - years) * 12);

  if (years === 0) {
    return `${months}ヶ月`;
  }
  if (months === 0) {
    return `${years}年`;
  }
  return `${years}年${months}ヶ月`;
}

/**
 * 日付をフォーマット
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ja-JP');
}

/**
 * フィールド表示コンポーネント
 */
interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, children, className = '' }: FieldProps) {
  return (
    <div className={`min-h-[60px] ${className}`}>
      <dt className="text-xs text-gray-500 mb-1">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

/**
 * 社員詳細パネルコンポーネント
 * マスターディテールレイアウトの右パネル用
 */
export function EmployeeDetailPanel({
  employee,
  onEdit,
  onDelete,
  canEdit,
}: EmployeeDetailPanelProps) {
  // スキルタグをグループ化
  const groupedSkills = useMemo(() => {
    if (!employee?.skills) return {};
    return employee.skills
      .filter((skill) => skill.tag?.name)
      .reduce<Record<string, EmployeeSkill[]>>((acc, skill) => {
        const categoryName = skill.tag?.category?.name || '未分類';
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(skill);
        return acc;
      }, {});
  }, [employee?.skills]);

  // 社員が選択されていない場合
  if (!employee) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-500">社員を選択してください</p>
      </div>
    );
  }

  const photoUrl = getPhotoUrl(employee.photoUrl);
  const isNotActive = employee.status !== 'ACTIVE';

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{employee.employeeNumber}</span>
          {isNotActive && (
            <Badge variant="error">
              {EmployeeStatusLabels[employee.status] || employee.status}
            </Badge>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title="編集"
              className="p-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              title="削除"
              className="p-2 text-red-600 hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        )}
      </div>

      {/* 詳細内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {/* 社員番号 | 契約形態 */}
          <Field label="社員番号">
            {employee.employeeNumber || '-'}
          </Field>
          <Field label="契約形態">
            {employee.contractType
              ? ContractTypeLabels[employee.contractType as ContractType] || employee.contractType
              : '-'}
          </Field>

          {/* 氏名 | フリガナ */}
          <Field label="氏名">
            {employee.fullName || '-'}
          </Field>
          <Field label="フリガナ">
            {employee.fullNameKana || '-'}
          </Field>

          {/* 肩書 | スキルタグ（複数行にまたがる可能性あり） */}
          <Field label="肩書">
            {employee.position || '-'}
          </Field>
          <Field label="スキルタグ" className="row-span-2">
            {Object.keys(groupedSkills).length > 0 ? (
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {Object.entries(groupedSkills).map(([categoryName, skills]) => (
                  <div key={categoryName}>
                    <p className="text-xs text-gray-400 mb-1">{categoryName}</p>
                    <div className="flex flex-wrap gap-1">
                      {skills.map((skill) => (
                        <SkillBadge
                          key={skill.id}
                          name={skill.tag?.name || ''}
                          level={skill.level}
                          className="text-xs py-0.5 px-2"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </Field>

          {/* 配属 | （スキルタグ続き） */}
          <Field label="配属">
            {employee.department || '-'}
          </Field>

          {/* 配属先契約期限 */}
          <Field label="配属先契約期限">
            {formatDate(employee.contractEndDate)}
          </Field>

          {/* 居住地 | 最寄駅 */}
          <Field label="居住地">
            {employee.residence || '-'}
          </Field>
          <Field label="最寄駅">
            {employee.station || '-'}
          </Field>

          {/* 誕生日(年齢計算) | 性別 */}
          <Field label="誕生日">
            {employee.birthDate ? (
              <>
                {formatDate(employee.birthDate)}
                <span className="ml-1 text-gray-500">
                  ({calculateAge(employee.birthDate)}歳)
                </span>
              </>
            ) : (
              '-'
            )}
          </Field>
          <Field label="性別">
            {employee.gender
              ? GenderLabels[employee.gender as Gender] || employee.gender
              : '-'}
          </Field>

          {/* 所属部署 | 拠点 */}
          <Field label="所属部署">
            {employee.department || '-'}
          </Field>
          <Field label="拠点">
            {employee.location || '-'}
          </Field>

          {/* 国籍 | メールアドレス */}
          <Field label="国籍">
            {employee.country || '-'}
          </Field>
          <Field label="メールアドレス">
            {employee.email ? (
              <a
                href={`mailto:${employee.email}`}
                className="text-blue-600 hover:underline break-all"
              >
                {employee.email}
              </a>
            ) : (
              '-'
            )}
          </Field>

          {/* 入社日(勤続年数) | ステータス */}
          <Field label="入社日">
            {employee.hireDate ? (
              <>
                {formatDate(employee.hireDate)}
                <span className="ml-1 text-gray-500">
                  (勤続{calculateYearsOfService(employee.hireDate)})
                </span>
              </>
            ) : (
              '-'
            )}
          </Field>
          <Field label="ステータス">
            <Badge
              variant={employee.status === 'ACTIVE' ? 'success' : employee.status === 'RESIGNED' ? 'error' : 'warning'}
            >
              {EmployeeStatusLabels[employee.status as EmployeeStatus] || employee.status}
            </Badge>
          </Field>

          {/* 備考 | 写真 */}
          <Field label="備考" className="col-span-1">
            <p className="whitespace-pre-wrap break-words max-h-[80px] overflow-y-auto">
              {employee.remark || '-'}
            </p>
          </Field>
          <Field label="写真" className="col-span-1">
            <div className="flex justify-end">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={employee.fullName}
                  className="w-[120px] h-[160px] object-cover rounded border border-gray-200"
                />
              ) : (
                <div className="w-[120px] h-[160px] bg-gradient-to-br from-gray-100 to-gray-200 rounded border border-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-4xl font-medium">
                    {employee.fullName?.charAt(0) || '?'}
                  </span>
                </div>
              )}
            </div>
          </Field>
        </dl>
      </div>
    </div>
  );
}

export default EmployeeDetailPanel;

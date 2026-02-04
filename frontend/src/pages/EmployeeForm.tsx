import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Input, Select } from '@/components/ui';
import { SkillTagSelector } from '@/components/employee';
import {
  useEmployee,
  useCreateEmployee,
  useUpdateEmployee,
  useAddEmployeeSkill,
} from '@/hooks/useEmployees';
import type {
  AddEmployeeSkillRequest,
  SelectOption,
  ContractType,
} from '@/types';
import { ContractTypeLabels } from '@/types';

// 部署オプション
const departmentOptions: SelectOption[] = [
  { label: '選択してください', value: '' },
  { label: '営業部', value: '営業部' },
  { label: '人材開発課', value: '人材開発課' },
  { label: '業務課', value: '業務課' },
  { label: '開発１課', value: '開発１課' },
  { label: '開発２課', value: '開発２課' },
  { label: '開発３課', value: '開発３課' },
  { label: '品質検証課', value: '品質検証課' },
  { label: 'CSD', value: 'CSD' },
  { label: 'NEXCS', value: 'NEXCS' },
];

// 役職オプション
const positionOptions: SelectOption[] = [
  { label: '選択してください', value: '' },
  { label: '一般', value: '一般' },
  { label: '主任', value: '主任' },
  { label: '係長', value: '係長' },
  { label: '課長', value: '課長' },
  { label: '部長', value: '部長' },
  { label: '財務部長', value: '財務部長' },
  { label: '社長', value: '社長' },
];

// 勤務地オプション
const locationOptions: SelectOption[] = [
  { label: '選択してください', value: '' },
  { label: '大阪', value: '大阪' },
  { label: '名古屋', value: '名古屋' },
  { label: '東京', value: '東京' },
  { label: '福岡', value: '福岡' },
  { label: '京都', value: '京都' },
  { label: '神戸', value: '神戸' },
  { label: '岡崎', value: '岡崎' },
];

// 国オプション
const countryOptions: SelectOption[] = [
  { label: '選択してください', value: '' },
  { label: '日本', value: '日本' },
  { label: 'アメリカ', value: 'アメリカ' },
  { label: 'インドネシア', value: 'インドネシア' },
  { label: 'スリランカ', value: 'スリランカ' },
  { label: 'ロシア', value: 'ロシア' },
  { label: 'ベトナム', value: 'ベトナム' },
  { label: '中国', value: '中国' },
  { label: '韓国', value: '韓国' },
  { label: 'スペイン', value: 'スペイン' },
  { label: 'タイ', value: 'タイ' },
];

// 契約形態オプション（ContractTypeLabels から動的生成）
const contractTypeOptions: SelectOption[] = [
  { label: '選択してください', value: '' },
  ...Object.entries(ContractTypeLabels).map(([value, label]) => ({
    label,
    value: value as ContractType,
  })),
];

// 性別オプション
const genderOptions: SelectOption[] = [
  { label: '選択してください', value: '' },
  { label: '男性', value: 'MALE' },
  { label: '女性', value: 'FEMALE' },
  { label: '設定なし', value: 'OTHER' },
];

// ステータスオプション
const statusOptions: SelectOption[] = [
  { label: '在籍', value: 'ACTIVE' },
  { label: '休職', value: 'INACTIVE' },
  { label: '退職（求職）', value: 'PENDING' },
  { label: '退職', value: 'RESIGNED' },
];

interface FormData {
  employeeNumber: string;
  employeeUniqueNumber: string;
  fullName: string;
  fullNameKana: string;
  email: string;
  birthDate: string;
  gender: string;
  contractType: string;
  department: string;
  position: string;
  location: string;
  country: string;
  residence: string;
  station: string;
  hireDate: string;
  contractEndDate: string;
  status: string;
  remark: string;
}

const initialFormData: FormData = {
  employeeNumber: '',
  employeeUniqueNumber: '',
  fullName: '',
  fullNameKana: '',
  email: '',
  birthDate: '',
  gender: '',
  contractType: '',
  department: '',
  position: '',
  location: '',
  country: '',
  residence: '',
  station: '',
  hireDate: '',
  contractEndDate: '',
  status: 'ACTIVE',
  remark: '',
};

export function EmployeeForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: employee, isLoading: isLoadingEmployee } = useEmployee(
    isEditMode ? id : undefined
  );
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const addEmployeeSkill = useAddEmployeeSkill();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedSkills, setSelectedSkills] = useState<AddEmployeeSkillRequest[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 編集モード時に既存データをフォームにセット
  useEffect(() => {
    if (employee && isEditMode) {
      setFormData({
        employeeNumber: employee.employeeNumber || '',
        employeeUniqueNumber: employee.employeeUniqueNumber || '',
        fullName: employee.fullName || '',
        fullNameKana: employee.fullNameKana || '',
        email: employee.email || '',
        birthDate: employee.birthDate?.split('T')[0] || '',
        gender: employee.gender || '',
        contractType: employee.contractType || '',
        department: employee.department || '',
        position: employee.position || '',
        location: employee.location || '',
        country: employee.country || '',
        residence: employee.residence || '',
        station: employee.station || '',
        hireDate: employee.hireDate?.split('T')[0] || '',
        contractEndDate: employee.contractEndDate?.split('T')[0] || '',
        status: employee.status || 'ACTIVE',
        remark: employee.remark || '',
      });
    }
  }, [employee, isEditMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.employeeNumber.trim()) {
      newErrors.employeeNumber = '社員番号は必須です';
    }
    if (!formData.fullName.trim()) {
      newErrors.fullName = '氏名は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const requestData = {
        employeeNumber: formData.employeeNumber,
        employeeUniqueNumber: formData.employeeUniqueNumber || undefined,
        fullName: formData.fullName,
        fullNameKana: formData.fullNameKana || undefined,
        email: formData.email || undefined,
        birthDate: formData.birthDate || undefined,
        gender: formData.gender || undefined,
        contractType: formData.contractType || undefined,
        department: formData.department || undefined,
        position: formData.position || undefined,
        location: formData.location || undefined,
        country: formData.country || undefined,
        residence: formData.residence || undefined,
        station: formData.station || undefined,
        hireDate: formData.hireDate || undefined,
        contractEndDate: formData.contractEndDate || undefined,
        status: formData.status || 'ACTIVE',
        remark: formData.remark || undefined,
      };

      if (isEditMode) {
        await updateEmployee.mutateAsync({
          id: id!,
          data: requestData,
        });

        for (const skill of selectedSkills) {
          await addEmployeeSkill.mutateAsync({
            employeeId: id!,
            data: skill,
          });
        }

        navigate(`/employees/${id}`);
      } else {
        const result = await createEmployee.mutateAsync(requestData);
        const newEmployeeId = result.data?.id || result.id;

        for (const skill of selectedSkills) {
          await addEmployeeSkill.mutateAsync({
            employeeId: newEmployeeId,
            data: skill,
          });
        }

        navigate(`/employees/${newEmployeeId}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isEditMode && isLoadingEmployee) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={isEditMode ? `/employees/${id}` : '/employees'}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {isEditMode ? '社員情報を編集' : '新規社員登録'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="社員番号"
              name="employeeNumber"
              value={formData.employeeNumber}
              onChange={handleChange}
              error={errors.employeeNumber}
              required
              placeholder="例: EMP001"
              maxLength={20}
            />

            <Input
              label="社員固有番号"
              name="employeeUniqueNumber"
              value={formData.employeeUniqueNumber}
              onChange={handleChange}
              placeholder="例: UNIQUE001"
              maxLength={50}
            />

            <Input
              label="氏名"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              error={errors.fullName}
              required
              placeholder="例: 山田 太郎"
              maxLength={100}
            />

            <Input
              label="氏名（カナ）"
              name="fullNameKana"
              value={formData.fullNameKana}
              onChange={handleChange}
              placeholder="例: ヤマダ タロウ"
              maxLength={100}
            />

            <Input
              label="メールアドレス"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="例: yamada@example.com"
              maxLength={255}
            />

            <Input
              label="生年月日"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleChange}
            />

            <Select
              label="性別"
              name="gender"
              options={genderOptions}
              value={formData.gender}
              onChange={handleChange}
            />

            <Select
              label="契約形態"
              name="contractType"
              options={contractTypeOptions}
              value={formData.contractType}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* 組織情報 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">組織情報</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="部署"
              name="department"
              options={departmentOptions}
              value={formData.department}
              onChange={handleChange}
            />

            <Select
              label="役職"
              name="position"
              options={positionOptions}
              value={formData.position}
              onChange={handleChange}
            />

            <Select
              label="勤務地"
              name="location"
              options={locationOptions}
              value={formData.location}
              onChange={handleChange}
            />

            <Select
              label="ステータス"
              name="status"
              options={statusOptions}
              value={formData.status}
              onChange={handleChange}
            />

            <Input
              label="入社日"
              name="hireDate"
              type="date"
              value={formData.hireDate}
              onChange={handleChange}
            />

            <Input
              label="契約終了日"
              name="contractEndDate"
              type="date"
              value={formData.contractEndDate}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* 住所・連絡先 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">住所・連絡先</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="国"
              name="country"
              options={countryOptions}
              value={formData.country}
              onChange={handleChange}
            />

            <Input
              label="最寄り駅"
              name="station"
              value={formData.station}
              onChange={handleChange}
              placeholder="例: 新大阪駅"
              maxLength={100}
            />

            <div className="md:col-span-2">
              <Input
                label="住所"
                name="residence"
                value={formData.residence}
                onChange={handleChange}
                placeholder="例: 大阪府大阪市北区..."
                maxLength={100}
              />
            </div>
          </div>
        </div>

        {/* 備考 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備考欄
            </label>
            <textarea
              name="remark"
              rows={4}
              value={formData.remark}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
              placeholder="特記事項があれば記入してください"
            />
          </div>
        </div>

        {/* スキル */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            スキル・経験
            {selectedSkills.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({selectedSkills.length}件追加予定)
              </span>
            )}
          </h2>

          <SkillTagSelector
            selectedSkills={selectedSkills}
            onChange={setSelectedSkills}
            existingSkills={employee?.skills}
          />
        </div>

        {/* 送信ボタン */}
        <div className="flex justify-end gap-3">
          <Link to={isEditMode ? `/employees/${id}` : '/employees'}>
            <Button type="button" variant="ghost">
              キャンセル
            </Button>
          </Link>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditMode ? '更新する' : '登録する'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default EmployeeForm;

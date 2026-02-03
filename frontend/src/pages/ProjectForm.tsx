import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useProject, useCreateProject, useUpdateProject } from '@/hooks/useProjects';
import { useCompanies } from '@/hooks/useCompanies';
import type { CreateProjectRequest, ProjectStatus, ContractTypeProject } from '@/types';

export function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: project, isLoading } = useProject(id);
  const { data: companiesData } = useCompanies({ limit: 100 });
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [formData, setFormData] = useState<CreateProjectRequest>({
    companyId: '',
    departmentId: undefined,
    name: '',
    description: '',
    status: 'ACTIVE',
    contractType: 'DISPATCH',
    startDate: '',
    endDate: '',
    remark: '',
  });

  const [selectedCompany, setSelectedCompany] = useState<string>('');

  useEffect(() => {
    if (project) {
      setFormData({
        companyId: project.companyId,
        departmentId: project.departmentId,
        name: project.name,
        description: project.description,
        status: project.status,
        contractType: project.contractType,
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        remark: project.remark,
      });
      setSelectedCompany(project.companyId);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const submitData = {
        ...formData,
        departmentId: formData.departmentId || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      if (isEdit) {
        await updateProject.mutateAsync({ id: id!, data: submitData });
      } else {
        await createProject.mutateAsync(submitData);
      }
      navigate('/projects');
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const selectedCompanyData = companiesData?.data.find((c: any) => c.id === selectedCompany);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '案件編集' : '案件登録'}
        </h1>
        <Link to="/projects">
          <Button variant="ghost">キャンセル</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                案件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                案件説明
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ステータス
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">稼働中</option>
                  <option value="INACTIVE">休止中</option>
                  <option value="COMPLETED">完了</option>
                  <option value="CANCELLED">キャンセル</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  契約形態 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.contractType}
                  onChange={(e) => setFormData({ ...formData, contractType: e.target.value as ContractTypeProject })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DISPATCH">派遣</option>
                  <option value="SES">SES</option>
                  <option value="CONTRACT">請負</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Company & Department */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">企業・部署</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                企業 <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.companyId}
                onChange={(e) => {
                  setFormData({ ...formData, companyId: e.target.value, departmentId: undefined });
                  setSelectedCompany(e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {companiesData?.data.map((company: any) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCompanyData?.departments && selectedCompanyData.departments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  部署
                </label>
                <select
                  value={formData.departmentId || ''}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>

        {/* Contract Period */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">契約期間</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Remark */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>
          <textarea
            rows={4}
            value={formData.remark}
            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/projects">
            <Button type="button" variant="ghost">
              キャンセル
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            loading={createProject.isPending || updateProject.isPending}
          >
            {isEdit ? '更新' : '登録'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProjectForm;

import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Badge, SkillBadge, Modal } from '@/components/ui';
import { useEmployee, useDeleteEmployee, useUploadEmployeeImage } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { EmployeeStatusLabels, ContractTypeLabels, type EmployeeSkill, type ContractType } from '@/types';
import { API_BASE_URL } from '@/api/config';

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isEditor = role === 'ADMIN' || role === 'EDITOR';

  const { data: employee, isLoading, error } = useEmployee(id);
  const deleteEmployee = useDeleteEmployee();
  const uploadImage = useUploadEmployeeImage();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employee) return;

    try {
      await uploadImage.mutateAsync({ employeeId: employee.id, file });
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
  };

  const getPhotoUrl = (photoUrl: string | undefined) => {
    if (!photoUrl) return undefined;
    if (photoUrl.startsWith('http')) return photoUrl;
    // 相対パスの場合はAPIサーバーのURLを付加
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${photoUrl}`;
  };

  const handleDelete = async () => {
    if (!employee) return;

    try {
      await deleteEmployee.mutateAsync(employee.id);
      navigate('/employees');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">社員情報の取得に失敗しました</p>
        <Link to="/employees">
          <Button variant="ghost" size="sm" className="mt-2">
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  const isNotActive = employee.status !== 'ACTIVE';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/employees"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          社員一覧に戻る
        </Link>

        {isEditor && (
          <div className="flex gap-2">
            <Link to={`/employees/${employee.id}/edit`}>
              <Button variant="secondary">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                編集
              </Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              削除
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-32"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end -mt-16 gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 relative group">
              {employee.photoUrl ? (
                <img
                  src={getPhotoUrl(employee.photoUrl)}
                  alt={employee.fullName}
                  className="h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg"
                />
              ) : (
                <div className="h-32 w-32 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-4xl">
                    {employee.fullName?.charAt(0)}
                  </span>
                </div>
              )}
              {isEditor && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadImage.isPending}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    title="写真を変更"
                  >
                    {uploadImage.isPending ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    ) : (
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1 pt-4 sm:pt-0 sm:pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{employee.fullName}</h1>
                {isNotActive && (
                  <Badge variant="error">
                    {EmployeeStatusLabels[employee.status] || employee.status}
                  </Badge>
                )}
              </div>
              {employee.fullNameKana && (
                <p className="text-sm text-gray-500 mt-1">{employee.fullNameKana}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                社員番号: {employee.employeeNumber}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">部署</dt>
              <dd className="text-sm text-gray-900">{employee.department || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">役職</dt>
              <dd className="text-sm text-gray-900">{employee.position || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">勤務地</dt>
              <dd className="text-sm text-gray-900">{employee.location || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">契約形態</dt>
              <dd className="text-sm text-gray-900">
                {employee.contractType
                  ? ContractTypeLabels[employee.contractType as ContractType] || employee.contractType
                  : '-'}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">入社日</dt>
              <dd className="text-sm text-gray-900">
                {employee.hireDate
                  ? new Date(employee.hireDate).toLocaleDateString('ja-JP')
                  : '-'}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">生年月日</dt>
              <dd className="text-sm text-gray-900">
                {employee.birthDate
                  ? new Date(employee.birthDate).toLocaleDateString('ja-JP')
                  : '-'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact & Location Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">連絡先・住所</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">メール</dt>
              <dd className="text-sm text-gray-900">
                {employee.email ? (
                  <a href={`mailto:${employee.email}`} className="text-blue-600 hover:underline">
                    {employee.email}
                  </a>
                ) : (
                  '-'
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">国</dt>
              <dd className="text-sm text-gray-900">{employee.country || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">住所</dt>
              <dd className="text-sm text-gray-900">{employee.residence || '-'}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 flex-shrink-0 text-sm text-gray-500">最寄り駅</dt>
              <dd className="text-sm text-gray-900">{employee.station || '-'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Remark */}
      {employee.remark && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{employee.remark}</p>
        </div>
      )}

      {/* Skills */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          スキル・経験
          {employee.skills && employee.skills.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({employee.skills.length}件)
            </span>
          )}
        </h2>

        {employee.skills && employee.skills.filter(s => s.tag?.name).length > 0 ? (
          <div className="space-y-4">
            {/* カテゴリ別にグループ化 */}
            {Object.entries(
              employee.skills
                .filter(skill => skill.tag?.name)
                .reduce<Record<string, EmployeeSkill[]>>((acc, skill) => {
                  const categoryName = skill.tag?.category?.name || '未分類';
                  if (!acc[categoryName]) {
                    acc[categoryName] = [];
                  }
                  acc[categoryName].push(skill);
                  return acc;
                }, {})
            ).map(([categoryName, skills]) => (
              <div key={categoryName}>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{categoryName}</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <SkillBadge
                      key={skill.id}
                      name={skill.tag?.name || ''}
                      level={skill.level}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">スキルが登録されていません</p>
        )}
      </div>

      {/* Project Assignments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          参画履歴
          {employee.assignments && employee.assignments.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({employee.assignments.length}件)
            </span>
          )}
        </h2>

        {employee.assignments && employee.assignments.length > 0 ? (
          <div className="space-y-3">
            {employee.assignments
              .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map(assignment => {
                const isActive = !assignment.endDate || new Date(assignment.endDate) > new Date();
                return (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">
                            {assignment.project ? (
                              <Link
                                to={`/projects/${assignment.project.id}`}
                                className="text-blue-600 hover:underline"
                              >
                                {assignment.project.name}
                              </Link>
                            ) : (
                              '不明な案件'
                            )}
                          </h3>
                          {isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              参画中
                            </span>
                          )}
                        </div>
                        {assignment.project?.company && (
                          <p className="text-sm text-gray-600 mt-1">
                            {assignment.project.company.name}
                          </p>
                        )}
                        {assignment.role && (
                          <p className="text-sm text-gray-600 mt-1">
                            役割: {assignment.role}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-sm text-gray-500">
                          {new Date(assignment.startDate).toLocaleDateString('ja-JP')}
                          {assignment.endDate && (
                            <> ~ {new Date(assignment.endDate).toLocaleDateString('ja-JP')}</>
                          )}
                        </div>
                      </div>
                    </div>
                    {assignment.remark && (
                      <p className="text-sm text-gray-600 mt-2">{assignment.remark}</p>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">参画履歴がありません</p>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="社員を削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{employee.fullName}</strong> さんを削除してもよろしいですか？
            <br />
            この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteModal(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteEmployee.isPending}
            >
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default EmployeeDetail;

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, StatusBadge, Modal } from '@/components/ui';
import { useProject, useDeleteProject, useCreateProjectAssignment, useUpdateProjectAssignment, useDeleteProjectAssignment } from '@/hooks/useProjects';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { ContractTypeProjectLabels, Employee, ProjectAssignment } from '@/types';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isEditor = role === 'ADMIN' || role === 'EDITOR';

  const { data: project, isLoading, error } = useProject(id);
  const deleteProject = useDeleteProject();
  const createAssignment = useCreateProjectAssignment();
  const updateAssignment = useUpdateProjectAssignment();
  const deleteAssignment = useDeleteProjectAssignment();
  const { data: employeesData, isLoading: isLoadingEmployees, error: employeesError } = useEmployees({ limit: 100 });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState('');
  const [assignmentEndDate, setAssignmentEndDate] = useState('');
  const [assignmentWorkload, setAssignmentWorkload] = useState('100');
  const [assignmentRemark, setAssignmentRemark] = useState('');
  const [assignmentDateError, setAssignmentDateError] = useState('');

  // Edit assignment modal state
  const [showEditAssignmentModal, setShowEditAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignment | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editWorkload, setEditWorkload] = useState('100');
  const [editRemark, setEditRemark] = useState('');
  const [editDateError, setEditDateError] = useState('');

  const handleDelete = async () => {
    if (!project) return;

    try {
      await deleteProject.mutateAsync(project.id);
      navigate('/projects');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleAddAssignment = async () => {
    if (!project || !selectedEmployeeId || !assignmentStartDate) return;

    // 日付の前後関係をチェック
    if (assignmentStartDate && assignmentEndDate) {
      if (new Date(assignmentStartDate) > new Date(assignmentEndDate)) {
        setAssignmentDateError('終了日は開始日以降の日付を指定してください');
        return;
      }
    }
    setAssignmentDateError('');

    try {
      await createAssignment.mutateAsync({
        projectId: project.id,
        employeeId: selectedEmployeeId,
        role: assignmentRole || undefined,
        assignmentStartDate: assignmentStartDate,
        assignmentEndDate: assignmentEndDate || undefined,
        workloadPercentage: parseInt(assignmentWorkload) || 100,
        remark: assignmentRemark || undefined,
      });
      setShowAddAssignmentModal(false);
      // フォームをリセット
      setSelectedEmployeeId('');
      setAssignmentRole('');
      setAssignmentStartDate('');
      setAssignmentEndDate('');
      setAssignmentWorkload('100');
      setAssignmentRemark('');
      setAssignmentDateError('');
    } catch (err) {
      console.error('Add assignment failed:', err);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!project || !confirm('この参画情報を削除してもよろしいですか？')) return;

    try {
      await deleteAssignment.mutateAsync({
        projectId: project.id,
        assignmentId,
      });
    } catch (err) {
      console.error('Delete assignment failed:', err);
    }
  };

  const openEditAssignmentModal = (assignment: ProjectAssignment) => {
    setEditingAssignment(assignment);
    setEditRole(assignment.role || '');
    setEditStartDate(assignment.assignmentStartDate ? new Date(assignment.assignmentStartDate).toISOString().split('T')[0] : '');
    setEditEndDate(assignment.assignmentEndDate ? new Date(assignment.assignmentEndDate).toISOString().split('T')[0] : '');
    setEditWorkload(assignment.workloadPercentage?.toString() || '100');
    setEditRemark(assignment.remark || '');
    setEditDateError('');
    setShowEditAssignmentModal(true);
  };

  const handleUpdateAssignment = async () => {
    if (!project || !editingAssignment || !editStartDate) return;

    // Validate dates
    if (editStartDate && editEndDate) {
      if (new Date(editStartDate) > new Date(editEndDate)) {
        setEditDateError('終了日は開始日以降の日付を指定してください');
        return;
      }
    }
    setEditDateError('');

    try {
      await updateAssignment.mutateAsync({
        projectId: project.id,
        assignmentId: editingAssignment.id,
        data: {
          role: editRole || undefined,
          assignmentStartDate: editStartDate,
          assignmentEndDate: editEndDate || undefined,
          workloadPercentage: parseInt(editWorkload) || 100,
          remark: editRemark || undefined,
        },
      });
      setShowEditAssignmentModal(false);
      setEditingAssignment(null);
    } catch (err) {
      console.error('Update assignment failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">案件情報の取得に失敗しました</p>
        <Link to="/projects">
          <Button variant="ghost" size="sm" className="mt-2">
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          案件一覧に戻る
        </Link>

        {isEditor && (
          <div className="flex gap-2">
            <Link to={`/projects/${project.id}/edit`}>
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

      {/* Project Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-gray-600 mt-2">{project.description}</p>
            )}
          </div>
          <StatusBadge status={project.status} type="project" />
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <dt className="text-sm text-gray-500">企業</dt>
            <dd className="text-sm text-gray-900 mt-1">
              {project.company ? (
                <Link
                  to={`/companies/${project.company.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {project.company.name}
                </Link>
              ) : (
                '-'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">部署</dt>
            <dd className="text-sm text-gray-900 mt-1">
              {project.department?.name || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">契約形態</dt>
            <dd className="text-sm text-gray-900 mt-1">
              {ContractTypeProjectLabels[project.contractType]}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">契約期間</dt>
            <dd className="text-sm text-gray-900 mt-1">
              {project.contractStartDate
                ? new Date(project.contractStartDate).toLocaleDateString('ja-JP')
                : '-'}
              {project.contractEndDate && ` ~ ${new Date(project.contractEndDate).toLocaleDateString('ja-JP')}`}
            </dd>
          </div>
        </dl>

        {project.remark && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <dt className="text-sm text-gray-500 mb-1">備考</dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">{project.remark}</dd>
          </div>
        )}
      </div>

      {/* Assignments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            参画社員
            {project.assignments && project.assignments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({project.assignments.length}名)
              </span>
            )}
          </h2>
          {isEditor && (
            <Button size="sm" onClick={() => setShowAddAssignmentModal(true)}>
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              社員を追加
            </Button>
          )}
        </div>

        {project.assignments && project.assignments.length > 0 ? (
          <div className="space-y-3">
            {project.assignments.map(assignment => (
              <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {assignment.employee ? (
                        <Link
                          to={`/employees/${assignment.employee.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          {assignment.employee.fullName}
                        </Link>
                      ) : (
                        '不明な社員'
                      )}
                    </h3>
                    {assignment.role && (
                      <p className="text-sm text-gray-600 mt-1">役割: {assignment.role}</p>
                    )}
                    <div className="text-sm text-gray-500 mt-1">
                      参画期間: {new Date(assignment.assignmentStartDate).toLocaleDateString('ja-JP')}
                      {assignment.assignmentEndDate && (
                        <> ~ {new Date(assignment.assignmentEndDate).toLocaleDateString('ja-JP')}</>
                      )}
                    </div>
                    {assignment.workloadPercentage && (
                      <div className="text-sm text-gray-500">稼働率: {assignment.workloadPercentage}%</div>
                    )}
                  </div>
                  {isEditor && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditAssignmentModal(assignment)}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="編集"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="削除"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {assignment.remark && (
                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                    備考: {assignment.remark}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">参画社員が登録されていません</p>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="案件を削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{project.name}</strong> を削除してもよろしいですか？
            <br />
            この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteProject.isPending}>
              削除する
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Assignment Modal */}
      <Modal
        isOpen={showAddAssignmentModal}
        onClose={() => setShowAddAssignmentModal(false)}
        title="社員を案件に追加"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              社員 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoadingEmployees}
            >
              <option value="">
                {isLoadingEmployees ? '読み込み中...' : '選択してください'}
              </option>
              {employeesError && (
                <option value="" disabled>
                  エラー: 社員データの取得に失敗しました
                </option>
              )}
              {employeesData?.data?.map((employee: Employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} ({employee.employeeNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">役割</label>
            <input
              type="text"
              value={assignmentRole}
              onChange={(e) => setAssignmentRole(e.target.value)}
              placeholder="例: プロジェクトリーダー、開発担当"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参画開始日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={assignmentStartDate}
                onChange={(e) => {
                  setAssignmentStartDate(e.target.value);
                  setAssignmentDateError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参画終了日
              </label>
              <input
                type="date"
                value={assignmentEndDate}
                onChange={(e) => {
                  setAssignmentEndDate(e.target.value);
                  setAssignmentDateError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {assignmentDateError && (
            <p className="text-sm text-red-600">{assignmentDateError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              稼働率 (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={assignmentWorkload}
              onChange={(e) => setAssignmentWorkload(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={assignmentRemark}
              onChange={(e) => setAssignmentRemark(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowAddAssignmentModal(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddAssignment}
              loading={createAssignment.isPending}
              disabled={!selectedEmployeeId || !assignmentStartDate}
            >
              追加する
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Assignment Modal */}
      <Modal
        isOpen={showEditAssignmentModal}
        onClose={() => setShowEditAssignmentModal(false)}
        title="参画情報を編集"
      >
        <div className="space-y-4">
          {editingAssignment?.employee && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-600">社員</p>
              <p className="font-medium text-gray-900">{editingAssignment.employee.fullName}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">役割</label>
            <input
              type="text"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              placeholder="例: プロジェクトリーダー、開発担当"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参画開始日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => {
                  setEditStartDate(e.target.value);
                  setEditDateError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参画終了日
              </label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => {
                  setEditEndDate(e.target.value);
                  setEditDateError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {editDateError && (
            <p className="text-sm text-red-600">{editDateError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              稼働率 (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={editWorkload}
              onChange={(e) => setEditWorkload(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={editRemark}
              onChange={(e) => setEditRemark(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowEditAssignmentModal(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleUpdateAssignment}
              loading={updateAssignment.isPending}
              disabled={!editStartDate}
            >
              更新する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ProjectDetail;

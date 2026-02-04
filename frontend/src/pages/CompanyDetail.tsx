import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, StatusBadge, Modal, Input, Select } from '@/components/ui';
import {
  useCompany,
  useDeleteCompany,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/useCompanies';
import type { CreateDepartmentRequest, UpdateDepartmentRequest } from '@/hooks/useCompanies';
import { useProjects } from '@/hooks/useProjects';
import { useAuth } from '@/hooks/useAuth';
import type { CompanyDepartment, DepartmentType } from '@/types';
import { DepartmentTypeLabels } from '@/types';

// 部署タイプのオプション
const departmentTypeOptions = Object.entries(DepartmentTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

// 部署フォームの状態型
interface DepartmentFormState {
  name: string;
  type: DepartmentType;
  parentId: string;
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isEditor = role === 'ADMIN' || role === 'EDITOR';

  const { data: company, isLoading, error } = useCompany(id);
  const { data: projectsData } = useProjects({ companyId: id, limit: 100 });
  const deleteCompany = useDeleteCompany();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 部署管理の状態
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showDeleteDepartmentModal, setShowDeleteDepartmentModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<CompanyDepartment | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<CompanyDepartment | null>(null);
  const [departmentForm, setDepartmentForm] = useState<DepartmentFormState>({
    name: '',
    type: 'DEPARTMENT',
    parentId: '',
  });
  const [departmentFormError, setDepartmentFormError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!company) return;

    try {
      await deleteCompany.mutateAsync(company.id);
      navigate('/companies');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // 部署追加モーダルを開く
  const openAddDepartmentModal = (parentId?: string) => {
    setEditingDepartment(null);
    setDepartmentForm({
      name: '',
      type: 'DEPARTMENT',
      parentId: parentId || '',
    });
    setDepartmentFormError(null);
    setShowDepartmentModal(true);
  };

  // 部署編集モーダルを開く
  const openEditDepartmentModal = (department: CompanyDepartment) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      type: department.type,
      parentId: department.parentId || '',
    });
    setDepartmentFormError(null);
    setShowDepartmentModal(true);
  };

  // 部署削除モーダルを開く
  const openDeleteDepartmentModal = (department: CompanyDepartment) => {
    setDeletingDepartment(department);
    setShowDeleteDepartmentModal(true);
  };

  // 部署フォーム送信
  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!departmentForm.name.trim()) {
      setDepartmentFormError('部署名を入力してください');
      return;
    }

    try {
      const data: CreateDepartmentRequest | UpdateDepartmentRequest = {
        name: departmentForm.name.trim(),
        type: departmentForm.type,
        parentId: departmentForm.parentId || null,
      };

      if (editingDepartment) {
        await updateDepartment.mutateAsync({
          companyId: id,
          departmentId: editingDepartment.id,
          data,
        });
      } else {
        await createDepartment.mutateAsync({
          companyId: id,
          data: data as CreateDepartmentRequest,
        });
      }

      setShowDepartmentModal(false);
      setDepartmentFormError(null);
    } catch (err: any) {
      setDepartmentFormError(err.message || '部署の保存に失敗しました');
    }
  };

  // 部署削除
  const handleDeleteDepartment = async () => {
    if (!id || !deletingDepartment) return;

    try {
      await deleteDepartment.mutateAsync({
        companyId: id,
        departmentId: deletingDepartment.id,
      });
      setShowDeleteDepartmentModal(false);
      setDeletingDepartment(null);
    } catch (err: any) {
      console.error('Delete department failed:', err);
      alert(err.message || '部署の削除に失敗しました');
    }
  };

  // 部署リストをフラット化（親部署選択用、循環参照防止）
  const getFlatDepartments = (excludeId?: string): Array<{ id: string; name: string; level: number }> => {
    if (!company?.departments) return [];

    const result: Array<{ id: string; name: string; level: number }> = [];

    const flatten = (depts: CompanyDepartment[], level: number) => {
      depts.forEach(dept => {
        if (dept.id !== excludeId) {
          result.push({
            id: dept.id,
            name: '　'.repeat(level) + dept.name,
            level,
          });
          if (dept.children && dept.children.length > 0) {
            flatten(dept.children, level + 1);
          }
        }
      });
    };

    // company.departmentsはルート部署のみの可能性があるため、全部署をフラット化
    const allDepts = company.departments;
    flatten(allDepts.filter(d => !d.parentId), 0);

    return result;
  };

  // 部署をツリー構造に変換
  type DepartmentTreeNode = CompanyDepartment & { children: DepartmentTreeNode[] };

  const buildDepartmentTree = (departments: CompanyDepartment[]): DepartmentTreeNode[] => {
    const map = new Map<string, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    departments.forEach(dept => {
      map.set(dept.id, { ...dept, children: [] });
    });

    departments.forEach(dept => {
      const node = map.get(dept.id);
      if (dept.parentId) {
        const parent = map.get(dept.parentId);
        if (parent && node) {
          parent.children.push(node);
        }
      } else {
        if (node) roots.push(node);
      }
    });

    return roots;
  };

  const renderDepartmentTree = (departments: DepartmentTreeNode[], level = 0): React.ReactNode => {
    return departments.map(dept => (
      <div key={dept.id} style={{ marginLeft: `${level * 20}px` }} className="py-1">
        <div className="flex items-center justify-between group text-sm text-gray-700 hover:bg-gray-50 rounded px-2 py-1 -mx-2">
          <div className="flex items-center">
            {level > 0 && (
              <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span>{dept.name}</span>
            <span className="ml-2 text-xs text-gray-400">({DepartmentTypeLabels[dept.type]})</span>
          </div>
          {isEditor && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => openAddDepartmentModal(dept.id)}
                className="p-1 text-gray-400 hover:text-blue-600"
                title="子部署を追加"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => openEditDepartmentModal(dept)}
                className="p-1 text-gray-400 hover:text-blue-600"
                title="編集"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => openDeleteDepartmentModal(dept)}
                className="p-1 text-gray-400 hover:text-red-600"
                title="削除"
                disabled={dept.children && dept.children.length > 0}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {dept.children && dept.children.length > 0 && renderDepartmentTree(dept.children, level + 1)}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">企業情報の取得に失敗しました</p>
        <Link to="/companies">
          <Button variant="ghost" size="sm" className="mt-2">
            一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  const departmentTree = company.departments ? buildDepartmentTree(company.departments) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/companies"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          企業一覧に戻る
        </Link>

        {isEditor && (
          <div className="flex gap-2">
            <Link to={`/companies/${company.id}/edit`}>
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

      {/* Company Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            {company.nameKana && (
              <p className="text-sm text-gray-500 mt-1">{company.nameKana}</p>
            )}
          </div>
          <StatusBadge status={company.status} type="company" />
        </div>

        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div>
            <dt className="text-sm text-gray-500">業種</dt>
            <dd className="text-sm text-gray-900 mt-1">{company.industry || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Webサイト</dt>
            <dd className="text-sm text-gray-900 mt-1">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {company.website}
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
        </dl>

        {company.remark && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <dt className="text-sm text-gray-500 mb-1">備考</dt>
            <dd className="text-sm text-gray-700 whitespace-pre-wrap">{company.remark}</dd>
          </div>
        )}
      </div>

      {/* Offices */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          拠点一覧
          {company.offices && company.offices.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({company.offices.length}件)
            </span>
          )}
        </h2>

        {company.offices && company.offices.length > 0 ? (
          <div className="space-y-4">
            {company.offices.map(office => (
              <div key={office.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-900">{office.name}</h3>
                  {office.isHeadquarters && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      本社
                    </span>
                  )}
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  {office.postalCode && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">郵便番号</dt>
                      <dd className="text-gray-900">{office.postalCode}</dd>
                    </div>
                  )}
                  {office.address && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">住所</dt>
                      <dd className="text-gray-900">{office.address}</dd>
                    </div>
                  )}
                  {office.phone && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">電話番号</dt>
                      <dd className="text-gray-900">{office.phone}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">拠点情報が登録されていません</p>
        )}
      </div>

      {/* Departments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            部署階層
            {company.departments && company.departments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({company.departments.length}件)
              </span>
            )}
          </h2>
          {isEditor && (
            <Button variant="secondary" size="sm" onClick={() => openAddDepartmentModal()}>
              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              部署を追加
            </Button>
          )}
        </div>

        {departmentTree.length > 0 ? (
          <div className="space-y-1">
            {renderDepartmentTree(departmentTree)}
          </div>
        ) : (
          <p className="text-sm text-gray-500">部署情報が登録されていません</p>
        )}
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          担当窓口
          {company.contacts && company.contacts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({company.contacts.length}名)
            </span>
          )}
        </h2>

        {company.contacts && company.contacts.length > 0 ? (
          <div className="space-y-4">
            {company.contacts.map(contact => (
              <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{contact.name}</h3>
                    {contact.nameKana && (
                      <p className="text-sm text-gray-500">{contact.nameKana}</p>
                    )}
                  </div>
                  {contact.isPrimary && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      主担当
                    </span>
                  )}
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  {contact.title && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">役職</dt>
                      <dd className="text-gray-900">{contact.title}</dd>
                    </div>
                  )}
                  {contact.department && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">部署</dt>
                      <dd className="text-gray-900">{contact.department.name}</dd>
                    </div>
                  )}
                  {contact.email && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">メール</dt>
                      <dd className="text-gray-900">
                        <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">
                          {contact.email}
                        </a>
                      </dd>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">電話</dt>
                      <dd className="text-gray-900">{contact.phone}</dd>
                    </div>
                  )}
                  {contact.mobile && (
                    <div className="flex">
                      <dt className="text-gray-500 w-20">携帯</dt>
                      <dd className="text-gray-900">{contact.mobile}</dd>
                    </div>
                  )}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">担当窓口が登録されていません</p>
        )}
      </div>

      {/* Projects */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          案件一覧
          {projectsData?.data && projectsData.data.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({projectsData.data.length}件)
            </span>
          )}
        </h2>

        {projectsData?.data && projectsData.data.length > 0 ? (
          <div className="space-y-2">
            {projectsData.data.map((project: any) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <StatusBadge status={project.status} type="project" />
                </div>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">案件が登録されていません</p>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="企業を削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{company.name}</strong> を削除してもよろしいですか？
            <br />
            この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteCompany.isPending}>
              削除する
            </Button>
          </div>
        </div>
      </Modal>

      {/* Department Add/Edit Modal */}
      <Modal
        isOpen={showDepartmentModal}
        onClose={() => setShowDepartmentModal(false)}
        title={editingDepartment ? '部署を編集' : '部署を追加'}
      >
        <form onSubmit={handleDepartmentSubmit} className="space-y-4">
          <Input
            label="部署名"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
            placeholder="部署名を入力"
            error={departmentFormError || undefined}
          />

          <Select
            label="部署タイプ"
            value={departmentForm.type}
            onChange={(e) => setDepartmentForm({ ...departmentForm, type: e.target.value as DepartmentType })}
            options={departmentTypeOptions}
          />

          <Select
            label="親部署"
            value={departmentForm.parentId}
            onChange={(e) => setDepartmentForm({ ...departmentForm, parentId: e.target.value })}
            options={[
              { value: '', label: '（なし - ルート部署）' },
              ...getFlatDepartments(editingDepartment?.id).map(d => ({
                value: d.id,
                label: d.name,
              })),
            ]}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowDepartmentModal(false)}>
              キャンセル
            </Button>
            <Button
              type="submit"
              loading={createDepartment.isPending || updateDepartment.isPending}
            >
              {editingDepartment ? '更新' : '追加'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Department Delete Modal */}
      <Modal
        isOpen={showDeleteDepartmentModal}
        onClose={() => setShowDeleteDepartmentModal(false)}
        title="部署を削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{deletingDepartment?.name}</strong> を削除してもよろしいですか？
            <br />
            この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteDepartmentModal(false)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={handleDeleteDepartment} loading={deleteDepartment.isPending}>
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CompanyDetail;

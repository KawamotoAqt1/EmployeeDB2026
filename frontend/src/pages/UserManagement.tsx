import { useState } from 'react';
import { Button, Modal, Input, Select } from '@/components/ui';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, type CreateUserRequest, type UpdateUserRequest, type User } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    password: '',
    role: 'VIEWER',
  });

  const [editFormData, setEditFormData] = useState<UpdateUserRequest & { id: string }>({
    id: '',
    email: '',
    password: '',
    role: 'VIEWER',
  });

  const handleCreate = async () => {
    try {
      await createUser.mutateAsync(formData);
      setShowCreateModal(false);
      setFormData({ email: '', password: '', role: 'VIEWER' });
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      id: user.id,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      const { id, ...data } = editFormData;
      // パスワードが空の場合は更新しない
      const updateData: UpdateUserRequest = {
        email: data.email,
        role: data.role,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      await updateUser.mutateAsync({ id, data: updateData });
      setShowEditModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser.mutateAsync(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const users = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ユーザー追加
        </Button>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                メールアドレス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ロール
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日時
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user: User) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-gray-500">(現在のユーザー)</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'EDITOR'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'ADMIN' ? '管理者' : user.role === 'EDITOR' ? '編集者' : '閲覧者'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleDeleteClick(user)}
                    disabled={user.id === currentUser?.id}
                    className={`${
                      user.id === currentUser?.id
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-600 hover:text-red-900'
                    }`}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="ユーザー追加"
      >
        <div className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
            required
          />
          <Input
            label="パスワード"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="6文字以上"
            required
          />
          <Select
            label="ロール"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER' })}
            options={[
              { label: '閲覧者', value: 'VIEWER' },
              { label: '編集者', value: 'EDITOR' },
              { label: '管理者', value: 'ADMIN' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} loading={createUser.isPending}>
              作成
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="ユーザー編集"
      >
        <div className="space-y-4">
          <Input
            label="メールアドレス"
            type="email"
            value={editFormData.email}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            required
          />
          <Input
            label="パスワード"
            type="password"
            value={editFormData.password}
            onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
            placeholder="変更しない場合は空欄"
          />
          <Select
            label="ロール"
            value={editFormData.role}
            onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER' })}
            options={[
              { label: '閲覧者', value: 'VIEWER' },
              { label: '編集者', value: 'EDITOR' },
              { label: '管理者', value: 'ADMIN' },
            ]}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} loading={updateUser.isPending}>
              更新
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="ユーザー削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{selectedUser?.email}</strong> を削除してもよろしいですか？
            <br />
            この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteUser.isPending}>
              削除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default UserManagement;

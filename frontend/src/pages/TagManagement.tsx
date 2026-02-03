import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Input, Modal } from '@/components/ui';
import {
  useTags,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useCreateTagCategory,
  useUpdateTagCategory,
  useDeleteTagCategory,
  useReorderTags,
} from '@/hooks/useTags';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import type { Tag, TagCategory } from '@/types';

// ドラッグ可能なタグアイテムコンポーネント
interface SortableTagItemProps {
  tag: Tag;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableTagItem({ tag, onEdit, onDelete }: SortableTagItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors ${
        isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''
      }`}
    >
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        title="ドラッグして並び替え"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <span className="text-sm font-medium text-gray-700 block truncate pl-5 pr-6">
        {tag.name}
      </span>
      {/* Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={onEdit}
          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-white rounded"
          title="編集"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600 hover:bg-white rounded"
          title="削除"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type ModalType = 'createCategory' | 'editCategory' | 'deleteCategory' | 'createTag' | 'editTag' | 'deleteTag' | null;

export function TagManagement() {
  const { user } = useAuth();
  const { tags, categories, isLoading } = useTags();

  const createCategory = useCreateTagCategory();
  const updateCategory = useUpdateTagCategory();
  const deleteCategory = useDeleteTagCategory();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const reorderTags = useReorderTags();

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // フォーム状態
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '' });
  const [tagForm, setTagForm] = useState({ name: '', categoryId: '' });

  // dnd-kit センサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px動かしてからドラッグ開始
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 管理者でない場合はリダイレクト
  if (user?.role?.toUpperCase() !== 'ADMIN') {
    return <Navigate to="/employees" replace />;
  }

  // Set initial active category
  if (categories && categories.length > 0 && !activeCategory) {
    setActiveCategory(categories[0].id);
  }

  // 現在のカテゴリ
  const currentCategory = categories?.find((c) => c.id === activeCategory);

  // カテゴリ別タグ（検索フィルタ付き、sortOrder順にソート）
  const currentTags = useMemo(() => {
    const filtered = tags?.filter((tag) => {
      const matchesCategory = tag.categoryId === activeCategory;
      const matchesSearch = !searchQuery || tag.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }) || [];
    // sortOrder順にソート
    return [...filtered].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [tags, activeCategory, searchQuery]);

  // ドラッグ終了時のハンドラー
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = currentTags.findIndex((tag) => tag.id === active.id);
      const newIndex = currentTags.findIndex((tag) => tag.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // 新しい順序を計算
        const reorderedTags = arrayMove(currentTags, oldIndex, newIndex);
        const tagIds = reorderedTags.map((tag) => tag.id);

        // APIで保存
        try {
          await reorderTags.mutateAsync(tagIds);
        } catch (error) {
          console.error('Failed to reorder tags:', error);
        }
      }
    }
  };

  // モーダルを開く
  const openModal = (type: ModalType, category?: TagCategory, tag?: Tag) => {
    setModalType(type);
    if (category) setSelectedCategory(category);
    if (tag) setSelectedTag(tag);

    if (type === 'editCategory' && category) {
      setCategoryForm({ name: category.name, code: category.code || '' });
    } else if (type === 'createCategory') {
      setCategoryForm({ name: '', code: '' });
    } else if (type === 'editTag' && tag) {
      setTagForm({ name: tag.name, categoryId: tag.categoryId });
    } else if (type === 'createTag' && category) {
      setTagForm({ name: '', categoryId: category.id });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedCategory(null);
    setSelectedTag(null);
    setCategoryForm({ name: '', code: '' });
    setTagForm({ name: '', categoryId: '' });
  };

  // カテゴリ作成
  const handleCreateCategory = async () => {
    try {
      await createCategory.mutateAsync({ name: categoryForm.name });
      closeModal();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  // カテゴリ更新
  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;
    try {
      await updateCategory.mutateAsync({
        id: selectedCategory.id,
        data: { name: categoryForm.name },
      });
      closeModal();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  // カテゴリ削除
  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      await deleteCategory.mutateAsync(selectedCategory.id);
      setActiveCategory(categories?.[0]?.id || null);
      closeModal();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // タグ作成
  const handleCreateTag = async () => {
    try {
      await createTag.mutateAsync({
        name: tagForm.name,
        categoryId: tagForm.categoryId,
      });
      closeModal();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  // タグ更新
  const handleUpdateTag = async () => {
    if (!selectedTag) return;
    try {
      await updateTag.mutateAsync({
        id: selectedTag.id,
        data: { name: tagForm.name },
      });
      closeModal();
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  // タグ削除
  const handleDeleteTag = async () => {
    if (!selectedTag) return;
    try {
      await deleteTag.mutateAsync(selectedTag.id);
      closeModal();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">タグ管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            スキルタグとカテゴリを管理します
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Category Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-1 flex overflow-x-auto">
              {categories?.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                  <span className="ml-2 text-xs text-gray-400">
                    ({tags?.filter((t) => t.categoryId === category.id).length || 0})
                  </span>
                </button>
              ))}
            </div>
            <div className="px-4 border-l border-gray-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openModal('createCategory')}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                カテゴリ追加
              </Button>
            </div>
          </div>
        </div>

        {/* Category Content */}
        {currentCategory && (
          <div>
            {/* Category Info & Actions */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold text-gray-900">{currentCategory.name}</h2>
                {currentCategory.code && (
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded">
                    {currentCategory.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openModal('editCategory', currentCategory)}
                >
                  編集
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openModal('deleteCategory', currentCategory)}
                >
                  削除
                </Button>
              </div>
            </div>

            {/* Search & Add */}
            <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="タグを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-gray-400 hidden sm:inline">
                ドラッグで並び替え可能
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openModal('createTag', currentCategory)}
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                タグを追加
              </Button>
            </div>

            {/* Tags Grid */}
            <div className="p-6">
              {currentTags.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={currentTags.map((t) => t.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {currentTags.map((tag) => (
                        <SortableTagItem
                          key={tag.id}
                          tag={tag}
                          onEdit={() => openModal('editTag', currentCategory, tag)}
                          onDelete={() => openModal('deleteTag', currentCategory, tag)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  {reorderTags.isPending && (
                    <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      保存中...
                    </div>
                  )}
                </DndContext>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <p className="mt-4 text-sm text-gray-500">
                    {searchQuery ? '検索結果がありません' : 'タグがありません'}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4"
                      onClick={() => openModal('createTag', currentCategory)}
                    >
                      最初のタグを追加
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Categories */}
        {(!categories || categories.length === 0) && (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              カテゴリがありません
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              最初のカテゴリを作成してタグの管理を始めましょう
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => openModal('createCategory')}
            >
              カテゴリを作成
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Category Modal */}
      <Modal
        isOpen={modalType === 'createCategory' || modalType === 'editCategory'}
        onClose={closeModal}
        title={modalType === 'createCategory' ? 'カテゴリを作成' : 'カテゴリを編集'}
      >
        <div className="space-y-4">
          <Input
            label="カテゴリ名"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: プログラミング言語"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={modalType === 'createCategory' ? handleCreateCategory : handleUpdateCategory}
              loading={createCategory.isPending || updateCategory.isPending}
              disabled={!categoryForm.name.trim()}
            >
              {modalType === 'createCategory' ? '作成' : '更新'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        isOpen={modalType === 'deleteCategory'}
        onClose={closeModal}
        title="カテゴリを削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{selectedCategory?.name}</strong> を削除してもよろしいですか？
          </p>
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            このカテゴリに属するすべてのタグも削除されます。この操作は取り消せません。
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteCategory}
              loading={deleteCategory.isPending}
            >
              削除する
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit Tag Modal */}
      <Modal
        isOpen={modalType === 'createTag' || modalType === 'editTag'}
        onClose={closeModal}
        title={modalType === 'createTag' ? 'タグを作成' : 'タグを編集'}
      >
        <div className="space-y-4">
          <Input
            label="タグ名"
            value={tagForm.name}
            onChange={(e) => setTagForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="例: Python"
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button
              variant="primary"
              onClick={modalType === 'createTag' ? handleCreateTag : handleUpdateTag}
              loading={createTag.isPending || updateTag.isPending}
              disabled={!tagForm.name.trim()}
            >
              {modalType === 'createTag' ? '作成' : '更新'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Tag Modal */}
      <Modal
        isOpen={modalType === 'deleteTag'}
        onClose={closeModal}
        title="タグを削除"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{selectedTag?.name}</strong> を削除してもよろしいですか？
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={closeModal}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteTag}
              loading={deleteTag.isPending}
            >
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TagManagement;

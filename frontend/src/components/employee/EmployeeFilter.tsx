import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Input, Select } from '@/components/ui';
import type { EmployeeSearchParams, SelectOption, Tag, EmployeeStatus, MatchType } from '@/types';
import { useTags } from '@/hooks/useTags';

export interface EmployeeFilterProps {
  initialFilters?: EmployeeSearchParams;
  onFilter: (filters: EmployeeSearchParams) => void;
  onReset?: () => void;
}

// 固定の選択肢
const departmentOptions: SelectOption[] = [
  { label: 'すべて', value: '' },
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

const positionOptions: SelectOption[] = [
  { label: 'すべて', value: '' },
  { label: '一般', value: '一般' },
  { label: '主任', value: '主任' },
  { label: '係長', value: '係長' },
  { label: '課長', value: '課長' },
  { label: '部長', value: '部長' },
  { label: '財務部長', value: '財務部長' },
  { label: '社長', value: '社長' },
];

const statusOptions: SelectOption[] = [
  { label: 'すべて', value: '' },
  { label: '在籍', value: 'ACTIVE' },
  { label: '休職', value: 'INACTIVE' },
  { label: '退職（求職）', value: 'PENDING' },
  { label: '退職', value: 'RESIGNED' },
];

export function EmployeeFilter({
  initialFilters = {},
  onFilter,
  onReset,
}: EmployeeFilterProps) {
  const { tags, categories } = useTags();
  const [keyword, setKeyword] = useState(initialFilters.keyword || '');
  const [department, setDepartment] = useState(initialFilters.department || '');
  const [position, setPosition] = useState(initialFilters.position || '');
  const [status, setStatus] = useState<string>(initialFilters.status || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialFilters.tagIds || []
  );
  const [matchType, setMatchType] = useState<MatchType>('partial');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [tagSearch, setTagSearch] = useState('');
  const tagPickerRef = useRef<HTMLDivElement>(null);

  // 検索実行（デバウンス付き）
  const executeSearch = useCallback(() => {
    const filters: EmployeeSearchParams = {
      keyword: keyword || undefined,
      department: department || undefined,
      position: position || undefined,
      status: (status as EmployeeStatus) || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      matchType: matchType,
      tagOperator: 'AND', // タグはAND条件
    };
    onFilter(filters);
  }, [keyword, department, position, status, selectedTagIds, matchType, onFilter]);

  // 条件変更時に自動検索（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, department, position, status, selectedTagIds, matchType, executeSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagPickerRef.current && !tagPickerRef.current.contains(event.target as Node)) {
        setShowTagPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set initial active category
  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories, activeCategory]);

  const handleReset = () => {
    setKeyword('');
    setDepartment('');
    setPosition('');
    setStatus('');
    setSelectedTagIds([]);
    setTagSearch('');
    setMatchType('partial');
    onReset?.();
    onFilter({});
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  // Get selected tags info
  const selectedTags = tags?.filter((tag) => selectedTagIds.includes(tag.id)) || [];

  // Filter tags by search and category
  const filteredTags = tags?.filter((tag) => {
    const matchesCategory = !activeCategory || tag.categoryId === activeCategory;
    const matchesSearch = !tagSearch || tag.name.toLowerCase().includes(tagSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Compact Filter Row */}
      <div className="p-4 flex flex-wrap items-end gap-3">
        {/* キーワード検索 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">検索</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              placeholder="名前、社員番号、部署、勤務地など"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex items-center text-xs text-gray-500">
              <button
                type="button"
                onClick={() => setMatchType('partial')}
                className={`px-2 py-1 rounded-l border border-r-0 transition-colors ${
                  matchType === 'partial'
                    ? 'bg-gray-200 text-gray-700 border-gray-300'
                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}
              >
                部分
              </button>
              <button
                type="button"
                onClick={() => setMatchType('prefix')}
                className={`px-2 py-1 rounded-r border transition-colors ${
                  matchType === 'prefix'
                    ? 'bg-gray-200 text-gray-700 border-gray-300'
                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}
              >
                先頭
              </button>
            </div>
          </div>
        </div>

        {/* 部署 */}
        <div className="w-36">
          <Select
            label="部署"
            options={departmentOptions}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>

        {/* 役職 */}
        <div className="w-28">
          <Select
            label="役職"
            options={positionOptions}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </div>

        {/* ステータス */}
        <div className="w-32">
          <Select
            label="ステータス"
            options={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        {/* タグ選択ボタン */}
        <div className="relative" ref={tagPickerRef}>
          <button
            type="button"
            onClick={() => setShowTagPicker(!showTagPicker)}
            className="h-10 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            スキル
            {selectedTagIds.length > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {selectedTagIds.length}
              </span>
            )}
          </button>

          {/* タグピッカードロップダウン */}
          {showTagPicker && (
            <div className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              {/* 検索 */}
              <div className="p-3 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="スキルを検索..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* カテゴリタブ */}
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {categories?.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(category.id)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeCategory === category.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* タグリスト */}
              <div className="p-3 max-h-64 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  {filteredTags.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">該当するスキルがありません</p>
                  )}
                </div>
              </div>

              {/* 選択済み表示 */}
              {selectedTags.length > 0 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">選択中: {selectedTags.length}件</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => removeTag(tag.id)}
                          className="hover:text-blue-900"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* リセットボタン */}
        <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
          リセット
        </Button>
      </div>

      {/* 選択中のタグ表示 */}
      {selectedTags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
            >
              {tag.category?.name && (
                <span className="text-blue-400 text-xs">{tag.category.name}:</span>
              )}
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="hover:text-blue-900 ml-1"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmployeeFilter;

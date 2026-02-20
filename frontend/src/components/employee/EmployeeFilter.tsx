import { useState, useRef, useEffect, useCallback } from 'react';
import { Select } from '@/components/ui';
import type { EmployeeSearchParams, SelectOption, EmployeeStatus, MatchType } from '@/types';
import { useTags } from '@/hooks/useTags';

export interface EmployeeFilterProps {
  initialFilters?: EmployeeSearchParams;
  onFilter: (filters: EmployeeSearchParams) => void;
  onReset?: () => void;
  onAddNew?: () => void;
  showAddButton?: boolean;
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

const matchTypeOptions: SelectOption[] = [
  { label: '全文検索', value: 'partial' },
  { label: '先頭一致', value: 'prefix' },
];

export function EmployeeFilter({
  initialFilters = {},
  onFilter,
  onReset,
  onAddNew,
  showAddButton = false,
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
  const [isExpanded, setIsExpanded] = useState(false);
  const tagPickerRef = useRef<HTMLDivElement>(null);

  // onFilterをrefで保持し、コールバック参照の変化でデバウンスが再トリガーされるのを防ぐ
  const onFilterRef = useRef(onFilter);
  useEffect(() => {
    onFilterRef.current = onFilter;
  });

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
    onFilterRef.current(filters);
  }, [keyword, department, position, status, selectedTagIds, matchType]);

  // 条件変更時に自動検索（デバウンス）
  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [executeSearch]);

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

  // Check if any advanced filters are active
  const hasActiveAdvancedFilters = department || position || selectedTagIds.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Row 1: Status and Match Type */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-gray-100">
        <div className="w-28">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <select
            value={matchType}
            onChange={(e) => setMatchType(e.target.value as MatchType)}
            className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {matchTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          リセット
        </button>
      </div>

      {/* Row 2: Search box and action buttons */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="検索..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Add button */}
        {showAddButton && onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="h-10 w-10 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            title="新規登録"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {/* Expand/Collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`h-10 w-10 flex items-center justify-center border rounded-lg transition-colors ${
            hasActiveAdvancedFilters
              ? 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
          title={isExpanded ? '詳細フィルタを閉じる' : '詳細フィルタを開く'}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable section: Department, Position, Tags */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
          <div className="flex flex-wrap items-end gap-3">
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

            {/* タグ選択ボタン */}
            <div className="relative" ref={tagPickerRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">スキル</label>
              <button
                type="button"
                onClick={() => setShowTagPicker(!showTagPicker)}
                className="h-[38px] px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 bg-white"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                スキル選択
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
          </div>

          {/* 選択中のタグ表示 */}
          {selectedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center mr-1">タグ:</span>
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
      )}

      {/* Show active advanced filters badge when collapsed */}
      {!isExpanded && hasActiveAdvancedFilters && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">絞り込み:</span>
          {department && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {department}
              <button
                type="button"
                onClick={() => setDepartment('')}
                className="hover:text-gray-900"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {position && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {position}
              <button
                type="button"
                onClick={() => setPosition('')}
                className="hover:text-gray-900"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
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
      )}
    </div>
  );
}

export default EmployeeFilter;

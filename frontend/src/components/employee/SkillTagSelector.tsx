import { useState } from 'react';
import { clsx } from 'clsx';
import type { Tag, SkillLevel, EmployeeSkill, AddEmployeeSkillRequest } from '@/types';
import { SkillLevelLabels } from '@/types';
import { useTags } from '@/hooks/useTags';
import { Button } from '@/components/ui';

export interface SkillTagSelectorProps {
  selectedSkills: AddEmployeeSkillRequest[];
  onChange: (skills: AddEmployeeSkillRequest[]) => void;
  existingSkills?: EmployeeSkill[];
}

const skillLevels: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

export function SkillTagSelector({
  selectedSkills,
  onChange,
  existingSkills = [],
}: SkillTagSelectorProps) {
  const { tags, categories } = useTags();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>('INTERMEDIATE');

  // タグをカテゴリ別にグループ化
  const tagsByCategory = tags?.reduce((acc, tag) => {
    const categoryId = tag.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const isTagSelected = (tagId: string) =>
    selectedSkills.some((skill) => skill.tagId === tagId);

  const isTagExisting = (tagId: string) =>
    existingSkills.some((skill) => skill.tagId === tagId);

  const handleAddSkill = () => {
    if (!selectedTag) return;

    const newSkill: AddEmployeeSkillRequest = {
      tagId: selectedTag.id,
      level: selectedLevel,
    };

    onChange([...selectedSkills, newSkill]);
    setSelectedTag(null);
    setSelectedLevel('INTERMEDIATE');
  };

  const handleRemoveSkill = (tagId: string) => {
    onChange(selectedSkills.filter((skill) => skill.tagId !== tagId));
  };

  const getTagName = (tagId: string) => {
    return tags?.find((t) => t.id === tagId)?.name || '';
  };

  return (
    <div className="space-y-4">
      {/* 選択済みスキル */}
      {selectedSkills.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">追加するスキル</p>
          <div className="flex flex-wrap gap-2">
            {selectedSkills.map((skill) => (
              <div
                key={skill.tagId}
                className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1"
              >
                <span className="text-sm font-medium">{getTagName(skill.tagId)}</span>
                <span className="text-xs text-gray-500">
                  ({SkillLevelLabels[skill.level]})
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill.tagId)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* タグ選択UI */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* カテゴリタブ */}
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-2">
          {categories?.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )
              }
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                expandedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* タグリスト */}
        {expandedCategory && tagsByCategory?.[expandedCategory] && (
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {tagsByCategory[expandedCategory].map((tag) => {
                const isSelected = isTagSelected(tag.id);
                const isExisting = isTagExisting(tag.id);
                const isCurrentlySelecting = selectedTag?.id === tag.id;

                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={isSelected || isExisting}
                    onClick={() => setSelectedTag(tag)}
                    className={clsx(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      isCurrentlySelecting
                        ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                        : isSelected || isExisting
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {tag.name}
                    {isExisting && ' (登録済)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* レベル選択 */}
        {selectedTag && (
          <div className="border-t border-gray-200 p-4 bg-blue-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  {selectedTag.name} のレベルを選択
                </p>
                <div className="flex gap-2">
                  {skillLevels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedLevel(level)}
                      className={clsx(
                        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        selectedLevel === level
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
                      )}
                    >
                      {SkillLevelLabels[level]}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="button" onClick={handleAddSkill} size="sm">
                追加
              </Button>
            </div>
          </div>
        )}
      </div>

      {!expandedCategory && (
        <p className="text-sm text-gray-500 text-center py-4">
          カテゴリを選択してスキルを追加してください
        </p>
      )}
    </div>
  );
}

export default SkillTagSelector;

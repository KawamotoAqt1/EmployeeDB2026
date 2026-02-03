import { ReactNode } from 'react';
import { clsx } from 'clsx';

// DetailGrid.Item の Props
export interface DetailGridItemProps {
  label: string;
  value: ReactNode;
  className?: string;
  /** 下線でセパレート（デフォルト: false） */
  bordered?: boolean;
}

// DetailGrid の Props
export interface DetailGridProps {
  children: ReactNode;
  className?: string;
  /** グリッドギャップ（デフォルト: 'normal'） */
  gap?: 'normal' | 'wide';
}

/**
 * 個々のフィールド（ラベル + 値）
 */
function DetailGridItem({ label, value, className, bordered = false }: DetailGridItemProps) {
  return (
    <div
      className={clsx(
        'flex flex-col',
        bordered && 'pb-4 border-b border-gray-200',
        className
      )}
    >
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 text-base text-gray-900">
        {value ?? '-'}
      </dd>
    </div>
  );
}

/**
 * 詳細情報を2カラムグリッドで表示するコンポーネント
 *
 * @example
 * ```tsx
 * <DetailGrid>
 *   <DetailGrid.Item label="社員番号" value="200214" />
 *   <DetailGrid.Item label="契約形態" value="正社員" />
 *   <DetailGrid.Item label="氏名" value="高田 敬子" />
 *   <DetailGrid.Item label="フリガナ" value="タカタ ケイコ" />
 * </DetailGrid>
 * ```
 */
function DetailGrid({ children, className, gap = 'normal' }: DetailGridProps) {
  return (
    <dl
      className={clsx(
        'grid grid-cols-1 md:grid-cols-2',
        gap === 'normal' ? 'gap-4' : 'gap-6',
        className
      )}
    >
      {children}
    </dl>
  );
}

// Compound Component パターンで Item を付与
DetailGrid.Item = DetailGridItem;

export { DetailGrid };
export default DetailGrid;

import { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface MasterDetailProps {
  /** 左パネル（マスター）の内容 */
  master: ReactNode;
  /** 右パネル（詳細）の内容 */
  detail: ReactNode;
  /** 左パネルの幅（デフォルト: "30%"）- lg以上で適用 */
  masterWidth?: string;
  /** 左パネルの最大幅（デフォルト: "400px"）- lg以上で適用 */
  masterMaxWidth?: string;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * マスターディテール型レイアウトコンポーネント
 *
 * lg以上(>=1024px): 2カラム表示（左30%、右70%）
 * lg未満: masterのみ表示（detailは別ページで表示する想定）
 *
 * @example
 * ```tsx
 * <MasterDetail
 *   master={<EmployeeList />}
 *   detail={<EmployeeDetail />}
 * />
 * ```
 */
export function MasterDetail({
  master,
  detail,
  masterWidth = '30%',
  masterMaxWidth = '400px',
  className,
}: MasterDetailProps) {
  // CSS変数としてスタイルを渡すことで、メディアクエリとの組み合わせを可能にする
  const cssVariables = {
    '--master-width': masterWidth,
    '--master-max-width': masterMaxWidth,
  } as React.CSSProperties;

  return (
    <div
      className={clsx(
        'flex h-[calc(100vh-4rem)]', // 4rem = 64px (ヘッダー高さ h-16)
        className
      )}
      style={cssVariables}
    >
      {/* マスターパネル（左） */}
      {/* lg未満: 100%幅、lg以上: masterWidth（max: masterMaxWidth） */}
      <aside
        className={clsx(
          'flex-shrink-0',
          'border-r border-gray-200',
          'overflow-y-auto',
          'bg-white',
          // レスポンシブ幅制御
          'w-full',
          'lg:w-[var(--master-width)]',
          'lg:max-w-[var(--master-max-width)]'
        )}
      >
        {master}
      </aside>

      {/* 詳細パネル（右） - lg以上で表示 */}
      <main
        className={clsx(
          'hidden lg:block',
          'flex-1',
          'overflow-y-auto',
          'bg-gray-50'
        )}
      >
        {detail}
      </main>
    </div>
  );
}

export default MasterDetail;

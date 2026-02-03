import { ReactNode, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface ListItemProps {
  /** Avatar element to display on the left side */
  avatar?: ReactNode;
  /** Main title text */
  title: string;
  /** Subtitle text displayed below the title */
  subtitle?: string;
  /** Meta text displayed on the right side */
  meta?: string;
  /** Whether the item is selected */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  (
    {
      avatar,
      title,
      subtitle,
      meta,
      selected = false,
      onClick,
      className,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={clsx(
          'flex items-center px-4 py-3 transition-colors',
          onClick && 'cursor-pointer',
          selected
            ? 'border-l-4 border-l-[#0078D4] bg-[#DEECF9]'
            : 'border-l-4 border-l-transparent hover:bg-gray-50',
          className
        )}
      >
        {/* Avatar */}
        {avatar && <div className="flex-shrink-0 mr-3">{avatar}</div>}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-sm text-gray-500 truncate">{subtitle}</div>
          )}
        </div>

        {/* Meta and Chevron */}
        <div className="flex items-center ml-3 flex-shrink-0">
          {meta && (
            <span className="text-sm text-gray-500 mr-2">{meta}</span>
          )}
          {onClick && (
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      </div>
    );
  }
);

ListItem.displayName = 'ListItem';

export default ListItem;

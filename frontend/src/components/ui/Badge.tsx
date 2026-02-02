import { ReactNode } from 'react';
import { clsx } from 'clsx';
import type { SkillLevel } from '@/types';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// スキルレベル用バッジ
export interface SkillBadgeProps {
  level: SkillLevel;
  name: string;
  className?: string;
}

const skillLevelColors: Record<SkillLevel, string> = {
  BEGINNER: 'bg-gray-100 text-gray-700 border-gray-300',
  INTERMEDIATE: 'bg-blue-50 text-blue-700 border-blue-300',
  ADVANCED: 'bg-green-50 text-green-700 border-green-300',
  EXPERT: 'bg-purple-50 text-purple-700 border-purple-300',
};

const skillLevelLabels: Record<SkillLevel, string> = {
  BEGINNER: '初級',
  INTERMEDIATE: '中級',
  ADVANCED: '上級',
  EXPERT: 'エキスパート',
};

export function SkillBadge({ level, name, className }: SkillBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border',
        skillLevelColors[level],
        className
      )}
    >
      <span>{name}</span>
      <span className="text-xs opacity-75">({skillLevelLabels[level]})</span>
    </span>
  );
}

export default Badge;

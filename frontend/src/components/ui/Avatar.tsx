import { useState } from 'react';
import { clsx } from 'clsx';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /** 画像URL */
  src?: string | null;
  /** 代替テキスト */
  alt?: string;
  /** サイズ sm=32px, md=48px, lg=64px, xl=120px */
  size?: AvatarSize;
  /** イニシャル表示用の名前（画像がない場合に使用） */
  name?: string;
  /** 追加のCSSクラス */
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-[120px] h-[120px] text-2xl',
};

/**
 * 名前からイニシャルを取得する
 * 日本語名の場合は最初の1文字、英語名の場合は最初の2文字の頭文字
 */
function getInitials(name: string): string {
  if (!name) return '';

  const trimmed = name.trim();

  // 日本語（ひらがな、カタカナ、漢字）が含まれる場合は最初の1文字
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(trimmed)) {
    return trimmed.charAt(0);
  }

  // 英語名の場合はスペースで分割して頭文字を取得（最大2文字）
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }

  return trimmed.charAt(0).toUpperCase();
}

export function Avatar({
  src,
  alt = '',
  size = 'md',
  name,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const showImage = src && !imageError;
  const initials = name ? getInitials(name) : '';

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200 flex-shrink-0',
        sizeStyles[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || name || ''}
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
      ) : initials ? (
        <span className="font-medium text-gray-600 select-none">
          {initials}
        </span>
      ) : (
        // デフォルトユーザーアイコン
        <svg
          className="w-1/2 h-1/2 text-gray-400"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      )}
    </div>
  );
}

export default Avatar;

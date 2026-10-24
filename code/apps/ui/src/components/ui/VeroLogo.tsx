import React, { useEffect, useState } from 'react';
import { useTheme } from '../Providers/ThemeProvider';

export type LogoVariant = 'symbol' | 'symbol-bg' | 'black-bg' | 'white-bg' | 'full';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;

export interface VeroLogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  alt?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
  '2xl': 64,
};

export const VeroLogo: React.FC<VeroLogoProps> = ({
  variant = 'symbol-bg',
  size = 'md',
  className = '',
  alt = 'Vero Logo',
  ...props
}) => {
  let isDark = false;
  try {
    const themeContext = useTheme();
    isDark = themeContext.theme === 'dark';
  } catch {
    // If rendered outside ThemeProvider, detect from document class
    if (typeof document !== 'undefined') {
      isDark = document.documentElement.classList.contains('dark');
    }
  }

  // Fallback observer in case DOM theme changes outside context
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const px = typeof size === 'number' ? size : SIZE_MAP[size] || 32;

  const basePath = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/').replace(/\/$/, '');
  const toAssetUrl = (p: string) => `${basePath}${p.startsWith('/') ? p : `/${p}`}`;

  let src = toAssetUrl('/icons/BlackBG/android-chrome-192x192.png');

  switch (variant) {
    case 'symbol':
      // Transparent background: White V for dark theme, Black V for light theme
      src = toAssetUrl(
        isDark
          ? '/icons/V_White/android-chrome-192x192.png'
          : '/icons/V_black/android-chrome-192x192.png'
      );
      break;

    case 'symbol-bg':
      // Badge with background: BlackBG for dark theme, WhiteBG for light theme
      src = toAssetUrl(
        isDark
          ? '/icons/BlackBG/android-chrome-192x192.png'
          : '/icons/WhiteBG/android-chrome-192x192.png'
      );
      break;

    case 'black-bg':
      src = toAssetUrl('/icons/BlackBG/android-chrome-192x192.png');
      break;

    case 'white-bg':
      src = toAssetUrl('/icons/WhiteBG/android-chrome-192x192.png');
      break;

    case 'full':
      src = toAssetUrl('/icons/Vero_white/android-chrome-192x192.png');
      break;
  }

  return (
    <img
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={`inline-block shrink-0 select-none object-contain ${className}`}
      style={{ width: `${px}px`, height: `${px}px` }}
      loading="eager"
      {...props}
    />
  );
};

import React from 'react';
import { cn } from '../../utils/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: Size;
  className?: string;
  /** Renders a presence dot in the corner. */
  status?: 'online' | 'offline' | null;
  ring?: boolean;
}

const sizes: Record<Size, string> = {
  xs: 'w-7 h-7 text-2xs',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
  '2xl': 'w-28 h-28 text-4xl',
};

const dotSizes: Record<Size, string> = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

export function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic tint per person so avatars stay recognisable between sessions. */
function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return hash;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  className,
  status = null,
  ring = false,
}) => {
  const [failed, setFailed] = React.useState(false);
  const seed = name ?? 'unknown';
  const hue = hueFor(seed);

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={name ?? 'Avatar'}
          onError={() => setFailed(true)}
          className={cn(
            'rounded-full object-cover bg-muted',
            sizes[size],
            ring && 'ring-2 ring-background'
          )}
        />
      ) : (
        <span
          aria-label={name ?? 'Avatar'}
          className={cn(
            'rounded-full flex items-center justify-center font-semibold tracking-tight text-white select-none',
            sizes[size],
            ring && 'ring-2 ring-background'
          )}
          style={{
            background: `linear-gradient(135deg, hsl(${hue} 62% 48%), hsl(${(hue + 40) % 360} 62% 38%))`,
          }}
        >
          {initialsOf(name)}
        </span>
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-card',
            dotSizes[size],
            status === 'online' ? 'bg-success' : 'bg-subtle-foreground'
          )}
        />
      )}
    </span>
  );
};

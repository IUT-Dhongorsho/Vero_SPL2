import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

const variants = {
  text: 'rounded-md',
  circular: 'rounded-full',
  rectangular: 'rounded-xl',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
}) => (
  <div
    className={cn('skeleton-shimmer', variants[variant], className)}
    style={{ width, height }}
    aria-hidden
  />
);

export const TaskSkeleton: React.FC = () => (
  <div className="surface rounded-2xl p-5">
    <div className="flex justify-between mb-4">
      <Skeleton width="88px" height="22px" className="rounded-full" />
      <Skeleton width="64px" height="18px" />
    </div>
    <Skeleton width="80%" height="22px" className="mb-2.5" />
    <Skeleton width="60%" height="16px" className="mb-4" />
    <div className="flex justify-between">
      <Skeleton width="72px" height="18px" />
      <Skeleton width="56px" height="30px" className="rounded-lg" />
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 surface rounded-xl p-4">
        <Skeleton variant="circular" width="40px" height="40px" />
        <div className="flex-1 space-y-2">
          <Skeleton width={`${70 - i * 6}%`} height="16px" />
          <Skeleton width={`${45 - i * 4}%`} height="13px" />
        </div>
      </div>
    ))}
  </div>
);

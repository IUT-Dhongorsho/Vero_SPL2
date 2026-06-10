import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className,
}) => {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-800 animate-pulse',
        variants[variant],
        className
      )}
      style={{ width, height }}
    />
  );
};

export const TaskSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-4">
      <div className="flex justify-between mb-3">
        <Skeleton width="80px" height="20px" className="rounded-full" />
        <Skeleton width="60px" height="16px" />
      </div>
      <Skeleton width="80%" height="20px" className="mb-2" />
      <Skeleton width="60%" height="14px" className="mb-3" />
      <div className="flex justify-between">
        <Skeleton width="60px" height="16px" />
        <Skeleton width="50px" height="28px" className="rounded-lg" />
      </div>
    </div>
  );
};

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
        'bg-gray-200 dark:bg-gray-700 animate-pulse',
        variants[variant],
        className
      )}
      style={{ width, height }}
    />
  );
};

export const ProjectCardSkeleton: React.FC = () => {
  return (
    <div className="glass-card p-6">
      <Skeleton width="70%" height="24px" className="mb-2" />
      <Skeleton width="90%" height="16px" className="mb-4" />
      <div className="flex justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Skeleton width="80px" height="20px" />
        <Skeleton width="60px" height="20px" />
      </div>
    </div>
  );
};

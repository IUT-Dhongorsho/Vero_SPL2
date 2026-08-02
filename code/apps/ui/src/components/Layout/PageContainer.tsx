import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useNavigationStore } from '../../stores/navigationStore';
import { cn } from '../../utils/cn';

export interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Kept for backward compatibility with pages that still pass it. */
  sidebarItems?: unknown;
  topBarActions?: React.ReactNode;
  /** `full` removes the max-width and page padding — used by the Inbox. */
  layout?: 'default' | 'full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  topBarActions,
  layout = 'default',
}) => {
  const { isSidebarCollapsed } = useNavigationStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar title={title} subtitle={subtitle} actions={topBarActions} />

      <main
        className={cn(
          'transition-[margin] duration-300 min-h-screen pt-16',
          isSidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[264px]',
          layout === 'default' && 'px-4 py-6 md:px-8 md:py-8'
        )}
      >
        {layout === 'default' ? <div className="max-w-7xl mx-auto">{children}</div> : children}
      </main>
    </div>
  );
};

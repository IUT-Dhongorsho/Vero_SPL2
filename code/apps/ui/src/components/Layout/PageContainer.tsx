import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useNavigationStore } from '../../stores/navigationStore';

export interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  sidebarItems?: any; // Ignored, kept for backward compatibility with existing pages
  topBarActions?: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  topBarActions,
}) => {
  const { isSidebarCollapsed } = useNavigationStore();
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar title={title} actions={topBarActions} />
      {/* Mobile: no left margin (sidebar is overlay). Desktop: push content right. */}
      <main
        className={`
          pt-24 pb-8 px-4 transition-all duration-300 min-h-screen
          md:pt-28 md:px-8
          ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'}
        `}
      >
        {children}
      </main>
    </div>
  );
};

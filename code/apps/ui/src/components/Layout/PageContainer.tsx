import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

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
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar title={title} actions={topBarActions} />
      <main className="ml-16 md:ml-64 pt-24 pb-8 px-4 md:pt-28 md:px-8 transition-all duration-300 min-h-screen">
        {children}
      </main>
    </div>
  );
};

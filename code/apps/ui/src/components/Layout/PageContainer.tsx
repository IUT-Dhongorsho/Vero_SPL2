import React from 'react';
import { Sidebar, SidebarItem } from './Sidebar';
import { TopBar } from './TopBar';

export interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  sidebarItems: SidebarItem[];
  topBarActions?: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  sidebarItems,
  topBarActions,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar items={sidebarItems} />
      <TopBar title={title} actions={topBarActions} />
      <main className="ml-64 pt-20 p-8">
        {children}
      </main>
    </div>
  );
};

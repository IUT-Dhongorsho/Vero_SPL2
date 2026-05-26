import React from 'react';
import { Sidebar, SidebarItem } from './Sidebar';
import { TopBar } from './TopBar';

export interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  sidebarItems: SidebarItem[];
  activeSidebarItem?: string;
  topBarActions?: React.ReactNode;
  onSidebarItemClick?: (href: string) => void;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  sidebarItems,
  activeSidebarItem,
  topBarActions,
  onSidebarItemClick,
}) => {
  return (
    <div>
      <Sidebar
        items={sidebarItems}
        activeItem={activeSidebarItem}
        onItemClick={onSidebarItemClick}
      />
      <TopBar title={title} actions={topBarActions} />
      <main
        style={{
          marginLeft: '260px',
          marginTop: '73px',
          padding: '32px',
          minHeight: 'calc(100vh - 73px)',
        }}
      >
        {children}
      </main>
    </div>
  );
};

import React, { useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useShell, type PageLayout } from './AppShell';
import type { Crumb } from '../../lib/routes';

export interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** The pages above this one, shown in the top bar instead of the subtitle. */
  crumbs?: Crumb[];
  /** Kept for backward compatibility with pages that still pass it. */
  sidebarItems?: unknown;
  topBarActions?: React.ReactNode;
  /** `full` removes the max-width and page padding — used by the Inbox. */
  layout?: PageLayout;
}

/**
 * A page inside the AppShell: it names itself in the top bar and places its
 * actions there, then renders its content. The sidebar and top bar belong to
 * the shell, so they stay mounted while pages change.
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  crumbs,
  topBarActions,
  layout = 'default',
}) => {
  const shell = useShell();

  // Before paint, so the top bar never shows the previous page's title.
  useLayoutEffect(() => {
    shell?.setMeta({ title, subtitle, crumbs, layout });
  }, [shell, title, subtitle, crumbs, layout]);

  return (
    <>
      {shell?.actionsSlot && topBarActions ? createPortal(topBarActions, shell.actionsSlot) : null}
      {layout === 'default' ? <div className="max-w-7xl mx-auto">{children}</div> : children}
    </>
  );
};

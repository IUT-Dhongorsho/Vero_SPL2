import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ModuleBar } from './ModuleBar';
import { useNavigationStore } from '../../stores/navigationStore';
import type { Crumb } from '../../lib/routes';
import { EASE_OUT } from '../../lib/motion';
import { cn } from '../../utils/cn';

export type PageLayout = 'default' | 'full';

interface PageMeta {
  title: string;
  subtitle?: string;
  /** Where this page sits; shown above the title, each step clickable. */
  crumbs?: Crumb[];
  layout: PageLayout;
}

interface ShellContextValue {
  setMeta: (meta: PageMeta) => void;
  /** Where pages portal their top-bar buttons. */
  actionsSlot: HTMLElement | null;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export const useShell = () => useContext(ShellContext);

const sameCrumbs = (a?: Crumb[], b?: Crumb[]) =>
  (a?.length ?? 0) === (b?.length ?? 0) &&
  (a ?? []).every((crumb, i) => crumb.label === b?.[i]?.label && crumb.to === b?.[i]?.to);

/**
 * The signed-in frame. Sidebar and top bar mount once and stay while pages
 * change underneath — only the content fades in — so navigating no longer
 * tears the whole screen down (and reconnects the notification socket) on
 * every click.
 *
 * Inside a module a second bar holds its tools. `--shell-top` is the height
 * of everything fixed above the content, so full-height pages size against it
 * instead of hard-coding the top bar.
 */
export const AppShell: React.FC = () => {
  const location = useLocation();
  const { isSidebarCollapsed } = useNavigationStore();
  const [meta, setMetaState] = useState<PageMeta>({ title: '', layout: 'default' });
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const moduleMatch = useMatch('/project/:projectId/module/:moduleId/*');
  const { projectId, moduleId } = moduleMatch?.params ?? {};
  const inModule = Boolean(projectId && moduleId);

  const setMeta = useCallback((next: PageMeta) => {
    setMetaState((current) =>
      current.title === next.title &&
      current.subtitle === next.subtitle &&
      current.layout === next.layout &&
      sameCrumbs(current.crumbs, next.crumbs)
        ? current
        : next
    );
  }, []);

  const value = useMemo(() => ({ setMeta, actionsSlot }), [setMeta, actionsSlot]);
  const offset = isSidebarCollapsed ? 'md:left-[68px]' : 'md:left-[264px]';

  return (
    <ShellContext.Provider value={value}>
      <div
        className="min-h-screen bg-background"
        style={{ '--shell-top': inModule ? '6.75rem' : '4rem' } as React.CSSProperties}
      >
        <Sidebar />
        <TopBar title={meta.title} subtitle={meta.subtitle} crumbs={meta.crumbs} actionsRef={setActionsSlot} />

        {inModule && (
          <div
            className={cn(
              'fixed top-16 right-0 left-0 h-11 z-30 bg-background/80 backdrop-blur-xl border-b border-border transition-[left] duration-300',
              offset
            )}
          >
            <ModuleBar projectId={projectId!} moduleId={moduleId!} />
          </div>
        )}

        <main
          className={cn(
            'transition-[margin] duration-300 min-h-screen',
            isSidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[264px]',
            // These are written as explicit pt/pb because a shorthand `py-*`
            // would win the tailwind-merge conflict and swallow the offset.
            meta.layout === 'default'
              ? 'px-4 pt-[calc(var(--shell-top)+1.5rem)] pb-8 md:px-8 md:pt-[calc(var(--shell-top)+2rem)] md:pb-10'
              : 'pt-[var(--shell-top)]'
          )}
        >
          {/* Keyed by path: a new page fades in; the old one is simply replaced. */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: EASE_OUT }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </ShellContext.Provider>
  );
};

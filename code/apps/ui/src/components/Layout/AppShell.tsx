import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useNavigationStore } from '../../stores/navigationStore';
import { EASE_OUT } from '../../lib/motion';
import { cn } from '../../utils/cn';

export type PageLayout = 'default' | 'full';

interface PageMeta {
  title: string;
  subtitle?: string;
  layout: PageLayout;
}

interface ShellContextValue {
  setMeta: (meta: PageMeta) => void;
  /** Where pages portal their top-bar buttons. */
  actionsSlot: HTMLElement | null;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export const useShell = () => useContext(ShellContext);

/**
 * The signed-in frame. Sidebar and top bar mount once and stay while pages
 * change underneath — only the content fades in — so navigating no longer
 * tears the whole screen down (and reconnects the notification socket) on
 * every click.
 */
export const AppShell: React.FC = () => {
  const location = useLocation();
  const { isSidebarCollapsed } = useNavigationStore();
  const [meta, setMetaState] = useState<PageMeta>({ title: '', layout: 'default' });
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);

  const setMeta = useCallback((next: PageMeta) => {
    setMetaState((current) =>
      current.title === next.title && current.subtitle === next.subtitle && current.layout === next.layout ? current : next
    );
  }, []);

  const value = useMemo(() => ({ setMeta, actionsSlot }), [setMeta, actionsSlot]);

  return (
    <ShellContext.Provider value={value}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <TopBar title={meta.title} subtitle={meta.subtitle} actionsRef={setActionsSlot} />

        <main
          className={cn(
            'transition-[margin] duration-300 min-h-screen',
            isSidebarCollapsed ? 'md:ml-[68px]' : 'md:ml-[264px]',
            // The top bar is fixed at h-16, so the padding has to clear it. These
            // are written as explicit pt/pb because a shorthand `py-*` would win
            // the tailwind-merge conflict and swallow the offset.
            meta.layout === 'default' ? 'px-4 pt-22 pb-8 md:px-8 md:pt-24 md:pb-10' : 'pt-16'
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

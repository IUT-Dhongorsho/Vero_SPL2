import React, { useEffect } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuthStore } from '../../stores/auth.store';
import { useNotificationStore } from '../../stores/notification.store';
import { useNavigationStore } from '../../stores/navigationStore';
import { Avatar } from '../ui/Avatar';
import type { Crumb } from '../../lib/routes';
import { cn } from '../../utils/cn';

export interface TopBarProps {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  /** The shell passes a slot pages portal their buttons into. */
  actionsRef?: (node: HTMLDivElement | null) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, crumbs, actions, actionsRef }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state._hasHydrated);

  const connectSocket = useNotificationStore((state) => state.connectSocket);
  const disconnectSocket = useNotificationStore((state) => state.disconnectSocket);
  const { isSidebarCollapsed } = useNavigationStore();

  useEffect(() => {
    if (user?.id) connectSocket(user.id);
    return () => disconnectSocket();
  }, [user?.id, connectSocket, disconnectSocket]);

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('vero:open-search'));
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 left-0 h-16 z-40 flex items-center justify-between gap-4 px-4 md:px-8',
        'bg-background/80 backdrop-blur-xl border-b border-border transition-[left] duration-300',
        isSidebarCollapsed ? 'md:left-[68px]' : 'md:left-[264px]'
      )}
    >
      <div className="min-w-0 pl-12 md:pl-0">
        {crumbs?.length ? (
          <nav aria-label="You are here" className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            {crumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && <ChevronRight className="w-3 h-3 shrink-0 text-subtle-foreground" aria-hidden />}
                {crumb.to ? (
                  <Link to={crumb.to} className="truncate hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        <h1 className="text-lg font-semibold tracking-tight text-foreground truncate leading-tight">
          {title}
        </h1>
        {subtitle && !crumbs?.length && (
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={openSearch}
          className="hidden sm:flex items-center gap-2.5 h-10 pl-3.5 pr-2.5 rounded-xl bg-muted hover:bg-secondary text-muted-foreground border border-border transition-colors cursor-pointer"
        >
          <Search className="w-4 h-4 shrink-0" />
          <span className="text-sm">Search</span>
          <kbd className="text-2xs font-medium border border-border rounded-md px-1.5 py-0.5 bg-background text-subtle-foreground">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={openSearch}
          className="sm:hidden w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors grid place-items-center"
          aria-label="Search"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>

        {actions}
        <div ref={actionsRef} className="contents" />

        <NotificationDropdown />

        <button
          onClick={() => navigate('/profile')}
          title="Your profile"
          aria-label="Your profile"
          className="rounded-full hover:opacity-85 transition-opacity cursor-pointer shrink-0"
        >
          {!isHydrated ? (
            <span className="w-9 h-9 rounded-full skeleton-shimmer block" />
          ) : (
            <Avatar name={user?.name} src={user?.avatar} size="sm" />
          )}
        </button>
      </div>
    </header>
  );
};

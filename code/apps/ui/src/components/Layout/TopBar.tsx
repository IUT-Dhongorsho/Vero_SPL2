import React, { useEffect } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuthStore } from '../../stores/auth.store';
import { useNotificationStore } from '../../stores/notification.store';
import { useNavigationStore } from '../../stores/navigationStore';
import { Avatar } from '../ui/Avatar';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../utils/cn';

export interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle, actions }) => {
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
        <h1 className="text-lg font-semibold tracking-tight text-foreground truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
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

        <ThemeToggle />
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

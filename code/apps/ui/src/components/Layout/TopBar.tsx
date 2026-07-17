import React, { useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuthStore } from '../../stores/auth.store';
import { useNotificationStore } from '../../stores/notification.store';
import { useNavigate } from 'react-router-dom';

export interface TopBarProps {
  title: string;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, actions }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state._hasHydrated);
  
  const connectSocket = useNotificationStore((state) => state.connectSocket);
  const disconnectSocket = useNotificationStore((state) => state.disconnectSocket);

  useEffect(() => {
    if (user?.id) {
      connectSocket(user.id);
    }
    return () => {
      disconnectSocket();
    };
  }, [user?.id, connectSocket, disconnectSocket]);
  return (
    <header className="fixed top-0 right-0 left-16 md:left-64 h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-8 z-40 transition-all duration-300">
      
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2 cursor-pointer group rounded-md hover:bg-muted p-1 -ml-1 transition-colors">
        <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate max-w-[150px] md:max-w-none">{title}</h2>
        <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        {/* Global Search Trigger */}
        <button className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-full text-sm transition-colors ring-1 ring-border cursor-pointer">
          <Search className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Search...</span>
          <span className="hidden md:inline text-xs border border-border rounded px-1 ml-2 bg-background">⌘K</span>
        </button>

        {actions}
        
        <NotificationDropdown />

        <button
          onClick={() => navigate('/settings')}
          title="Account Settings"
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-muted overflow-hidden hover:opacity-85 transition-opacity cursor-pointer focus:outline-none shrink-0"
        >
          {!isHydrated ? (
            <div className="w-full h-full bg-muted animate-pulse" />
          ) : user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">{user?.name ? user.name.charAt(0).toUpperCase() : '👤'}</span>
          )}
        </button>
      </div>
    </header>
  );
};

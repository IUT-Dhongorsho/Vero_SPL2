import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { useNotificationStore } from '../../stores/notification.store';
import { NotificationDropdown } from './NotificationDropdown';

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

  // Synchronize WebSocket connection status with the active user session
  useEffect(() => {
    if (user?.id) {
      connectSocket(user.id);
    }
    return () => {
      disconnectSocket();
    };
  }, [user?.id, connectSocket, disconnectSocket]);

  return (
    <header className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-40">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      
      <div className="flex items-center gap-3">
        {actions}
        
        {/* Render the custom notification dropdown instead of the icon placeholder */}
        <NotificationDropdown />
        
        {/* User Profile Button */}
        <button
          onClick={() => navigate('/settings')}
          title="Account Settings"
          className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden hover:opacity-85 transition-opacity cursor-pointer focus:outline-none"
        >
          {!isHydrated ? (
            <div className="w-full h-full bg-gray-200 animate-pulse" />
          ) : user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">👤</span>
          )}
        </button>
      </div>
    </header>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Bell, 
  Check, 
  Trash2, 
  MessageSquare, 
  CheckSquare, 
  FolderKanban, 
  Inbox 
} from 'lucide-react';
import { useNotificationStore } from '../../stores/notification.store';
import { useAuthStore } from '../../stores/auth.store';

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const user = useAuthStore((state) => state.user);
  const { 
    notifications, 
    unreadCount, 
    fetchNotifications, 
    fetchUnreadCount,
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotificationStore();

  // Load initial notification data once user is authenticated
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
      fetchUnreadCount(user.id);
    }
  }, [user?.id]);

  // Click outside handler to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && user?.id) {
      // Re-fetch list to capture any updates when opened
      fetchNotifications(user.id);
      fetchUnreadCount(user.id);
    }
  };

  const handleNotificationClick = async (id: string, resourceUrl: string | null, isRead: boolean) => {
    if (user?.id && !isRead) {
      await markAsRead(user.id, id);
    }
    setIsOpen(false);
    if (resourceUrl) {
      navigate(resourceUrl);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent trigger parent card click handler
    if (user?.id) {
      await deleteNotification(user.id, id);
    }
  };

  const handleMarkAllRead = async () => {
    if (user?.id) {
      await markAllAsRead(user.id);
    }
  };

  // Helper to get formatted relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Render type-specific notification icons
  const getNotificationIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('chat') || lowerType.includes('message')) {
      return (
        <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
          <MessageSquare className="w-4 h-4" />
        </div>
      );
    }
    if (lowerType.includes('task')) {
      return (
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg">
          <CheckSquare className="w-4 h-4" />
        </div>
      );
    }
    if (lowerType.includes('project') || lowerType.includes('workspace')) {
      return (
        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
          <FolderKanban className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg">
        <Bell className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={toggleDropdown}
        aria-label="Toggle notifications"
        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Bell className="w-5 h-5 text-gray-500 hover:text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 origin-top-right backdrop-blur-md"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 rounded-full mb-3">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-semibold text-sm">All caught up!</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">You have no new notifications.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() =>
                      handleNotificationClick(notification.id, notification.resourceUrl, notification.isRead)
                    }
                    className={`p-4 flex gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer relative group ${
                      !notification.isRead ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''
                    }`}
                  >
                    {/* Unread marker bar */}
                    {!notification.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    )}

                    {getNotificationIcon(notification.type)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm text-gray-900 dark:text-white truncate ${
                          !notification.isRead ? 'font-semibold' : 'font-normal'
                        }`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5">
                          {getRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      
                      {notification.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                          {notification.body}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity self-center pl-1">
                      <button
                        onClick={(e) => handleDeleteClick(e, notification.id)}
                        title="Delete notification"
                        className="p-1 text-gray-400 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 rounded-md transition-colors focus:outline-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

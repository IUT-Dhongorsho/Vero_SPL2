import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../ui/ThemeToggle';

export interface SidebarItem {
  icon: string;
  label: string;
  href: string;
}

export interface SidebarProps {
  items: SidebarItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ items }) => {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 glass border-r border-gray-200/20 flex flex-col z-50">
      <div className="p-6 border-b border-gray-200/20">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Vero
        </h1>
        <p className="text-xs text-gray-500 mt-1">Workspace</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isActive(item.href)
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/20'
              }
            `}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200/20 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-500">Theme</span>
          <ThemeToggle />
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white/20 transition-all duration-200"
        >
          <span className="text-lg">⚙️</span>
          <span>Settings</span>
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-200"
        >
          <span className="text-lg">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export interface SidebarItem {
  icon: React.ReactNode;
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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-50">
      <div className="p-6 border-b border-gray-200">
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
                ? 'bg-gray-700 text-white'
                : 'text-gray-900 hover:bg-gray-700 hover:text-yellow-50'
              }
            `}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-gray-500">Theme</span>
          <ThemeToggle />
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

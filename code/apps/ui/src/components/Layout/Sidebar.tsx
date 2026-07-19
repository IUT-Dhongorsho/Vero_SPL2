import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Folder, Settings, Moon, Sun, UserCircle,
  ChevronLeft, ChevronRight, Menu, LogOut, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../Providers/ThemeProvider';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigationStore } from '../../stores/navigationStore';
import { authClient } from '../../lib/auth-client';

const NAV_ITEMS = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/projects', icon: Folder, label: 'Projects' },
];

const NavItem: React.FC<{
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}> = ({ to, icon: Icon, label, collapsed, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    title={label}
    className={({ isActive }) =>
      `flex items-center gap-3 p-2.5 rounded-lg transition-colors font-medium text-sm ${
        collapsed ? 'justify-center' : 'px-3'
      } ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`
    }
  >
    <Icon className="w-5 h-5 shrink-0" />
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
);

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { isSidebarCollapsed, toggleSidebar } = useNavigationStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authClient.signOut(); } catch {}
    clearAuth();
    navigate('/');
  };

  // On mobile: sidebar is always "collapsed" (icon-only w-16) unless explicitly opened via overlay
  // On desktop: respects isSidebarCollapsed toggle

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside
        className={`
          hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border
          flex-col z-50 transition-all duration-300
          ${isSidebarCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-border shrink-0">
          <div className="flex items-center overflow-hidden flex-1">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              V
            </div>
            {!isSidebarCollapsed && (
              <span className="ml-3 font-semibold truncate text-foreground">Vero Workspace</span>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted shrink-0 ml-1"
            title="Toggle sidebar"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} collapsed={isSidebarCollapsed} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border p-2 flex flex-col gap-1">
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className={`flex items-center gap-3 p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'px-3'}`}
          >
            {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
            {!isSidebarCollapsed && <span>Theme</span>}
          </button>

          <NavLink
            to="/settings"
            title="Settings"
            className={({ isActive }) =>
              `flex items-center gap-3 p-2.5 rounded-lg transition-colors text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'px-3'} ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
            }
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && <span>Settings</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            title="Logout"
            className={`flex items-center gap-3 p-2.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors text-sm font-medium ${isSidebarCollapsed ? 'justify-center' : 'px-3'}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>

          {/* Profile */}
          <div className={`mt-1 flex items-center gap-3 py-2 ${isSidebarCollapsed ? 'justify-center' : 'px-3'}`}>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
            ) : (
              <UserCircle className="w-8 h-8 text-muted-foreground shrink-0" />
            )}
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email || ''}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Mobile sidebar (drawer overlay) ─────────────────── */}
      <MobileSidebar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        handleLogout={handleLogout}
      />
    </>
  );
};

// ─── Mobile sidebar as a slide-in drawer ─────────────────────────────────────
const MobileSidebar: React.FC<{
  theme: string;
  toggleTheme: () => void;
  user: any;
  handleLogout: () => void;
}> = ({ theme, toggleTheme, user, handleLogout }) => {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Hamburger button — fixed top-left on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border shadow-sm text-foreground hover:bg-muted transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              className="md:hidden fixed inset-0 bg-black/50 z-[60]"
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 h-screen w-72 bg-card border-r border-border flex flex-col z-[70] shadow-2xl"
            >
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    V
                  </div>
                  <span className="font-semibold text-foreground">Vero Workspace</span>
                </div>
                <button onClick={close} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                  <NavItem key={item.to} {...item} collapsed={false} onClick={close} />
                ))}
              </nav>

              {/* Bottom */}
              <div className="border-t border-border p-2 flex flex-col gap-1">
                <button
                  onClick={() => { toggleTheme(); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-medium"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
                  <span>Toggle Theme</span>
                </button>

                <NavLink
                  to="/settings"
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
                  }
                >
                  <Settings className="w-5 h-5 shrink-0" />
                  <span>Settings</span>
                </NavLink>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <span>Logout</span>
                </button>

                {/* Profile */}
                <div className="flex items-center gap-3 px-3 py-2 mt-1">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
                  ) : (
                    <UserCircle className="w-8 h-8 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email || ''}</span>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

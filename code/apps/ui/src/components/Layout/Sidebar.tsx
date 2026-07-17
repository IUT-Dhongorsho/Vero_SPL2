import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Folder, Settings, Moon, Sun, UserCircle, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { useTheme } from '../Providers/ThemeProvider';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigationStore } from '../../stores/navigationStore';

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const { isSidebarCollapsed, toggleSidebar } = useNavigationStore();

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-50 transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Workspace Switcher / Logo placeholder */}
      <div className="h-16 flex items-center justify-between px-3 md:px-4 border-b border-border shrink-0">
        <div className="flex items-center cursor-pointer hover:bg-muted/50 transition-colors rounded overflow-hidden flex-1">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0 mx-auto md:mx-0">
            V
          </div>
          {!isSidebarCollapsed && (
            <span className="hidden md:block ml-3 font-semibold truncate text-foreground">
              Vero Workspace
            </span>
          )}
        </div>
        <button onClick={toggleSidebar} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted hidden md:block shrink-0">
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-2 overflow-y-auto">
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => 
            `flex items-center p-2 rounded-lg transition-colors ${!isSidebarCollapsed ? 'md:px-3' : 'justify-center'} ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
          title="Home"
        >
          <Home className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="hidden md:block ml-3 font-medium text-sm">Home</span>}
        </NavLink>
        <NavLink 
          to="/projects"
          className={({ isActive }) => 
            `flex items-center p-2 rounded-lg transition-colors ${!isSidebarCollapsed ? 'md:px-3' : 'justify-center'} ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
          title="Projects"
        >
          <Folder className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="hidden md:block ml-3 font-medium text-sm">Projects</span>}
        </NavLink>
      </nav>

      <div className="mt-auto border-t border-border p-2 flex flex-col gap-2">
        <button 
          onClick={toggleTheme}
          className={`flex items-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer ${!isSidebarCollapsed ? 'md:px-3' : 'justify-center'}`}
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
          {!isSidebarCollapsed && <span className="hidden md:block ml-3 font-medium text-sm">Theme</span>}
        </button>
        <NavLink 
          to="/settings"
          className={({ isActive }) => 
            `flex items-center p-2 rounded-lg transition-colors ${!isSidebarCollapsed ? 'md:px-3' : 'justify-center'} ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
          title="Settings"
        >
          <Settings className="w-5 h-5 shrink-0" />
          {!isSidebarCollapsed && <span className="hidden md:block ml-3 font-medium text-sm">Settings</span>}
        </NavLink>
        
        {/* Profile Avatar Bottom */}
        <div className={`mt-2 flex items-center py-2 cursor-pointer group ${!isSidebarCollapsed ? 'md:px-3' : 'justify-center'}`}>
           {user?.avatar ? (
             <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
           ) : (
             <UserCircle className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
           )}
           {!isSidebarCollapsed && (
             <div className="hidden md:flex flex-col ml-3 truncate">
               <span className="text-sm font-medium text-foreground truncate">{user?.name || 'Jane Doe'}</span>
               <span className="text-xs text-muted-foreground truncate">{user?.email || 'Profile'}</span>
             </div>
           )}
        </div>
      </div>
    </aside>
  );
};

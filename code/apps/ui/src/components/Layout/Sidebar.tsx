import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Folder, Settings, Moon, Sun, UserCircle } from 'lucide-react';
import { useTheme } from '../Providers/ThemeProvider';
import { useAuthStore } from '../../stores/auth.store';

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const user = useAuthStore((state) => state.user);

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 md:w-64 bg-card border-r border-border flex flex-col z-50 transition-all duration-300">
      {/* Workspace Switcher / Logo placeholder */}
      <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-border shrink-0 cursor-pointer hover:bg-muted/50 transition-colors">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
          V
        </div>
        <span className="hidden md:block ml-3 font-semibold truncate text-foreground">
          Vero Workspace
        </span>
      </div>

      <nav className="flex-1 py-4 flex flex-col gap-2 px-2 md:px-4 overflow-y-auto">
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => 
            `flex items-center p-2 md:px-3 md:py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
          title="Home"
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="hidden md:block ml-3 font-medium text-sm">Home</span>
        </NavLink>
        <NavLink 
          to="/projects"
          className={({ isActive }) => 
            `flex items-center p-2 md:px-3 md:py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
          title="Projects"
        >
          <Folder className="w-5 h-5 shrink-0" />
          <span className="hidden md:block ml-3 font-medium text-sm">Projects</span>
        </NavLink>
      </nav>

      <div className="mt-auto border-t border-border p-2 md:p-4 flex flex-col gap-2">
        <button 
          onClick={toggleTheme}
          className="flex items-center justify-center md:justify-start p-2 md:px-3 md:py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="w-5 h-5 shrink-0" /> : <Sun className="w-5 h-5 shrink-0" />}
          <span className="hidden md:block ml-3 font-medium text-sm">Theme</span>
        </button>
        <NavLink 
          to="/settings"
          className={({ isActive }) => 
            `flex items-center justify-center md:justify-start p-2 md:px-3 md:py-2.5 rounded-lg transition-colors ${isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`
          }
          title="Settings"
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className="hidden md:block ml-3 font-medium text-sm">Settings</span>
        </NavLink>
        
        {/* Profile Avatar Bottom */}
        <div className="mt-2 flex items-center justify-center md:justify-start md:px-3 py-2 cursor-pointer group">
           {user?.avatar ? (
             <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full shrink-0 object-cover" />
           ) : (
             <UserCircle className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
           )}
           <div className="hidden md:flex flex-col ml-3 truncate">
             <span className="text-sm font-medium text-foreground truncate">{user?.name || 'Jane Doe'}</span>
             <span className="text-xs text-muted-foreground truncate">{user?.email || 'Profile'}</span>
           </div>
        </div>
      </div>
    </aside>
  );
};

import React, { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FolderKanban,
  Home,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../Providers/ThemeProvider';
import { useAuthStore } from '../../stores/auth.store';
import { useNavigationStore } from '../../stores/navigationStore';
import { useInboxStore } from '../../stores/inbox.store';
import { useProjectStore } from '../../stores/project.store';
import { authClient } from '../../lib/auth-client';
import { projectHref } from '../../lib/routes';
import { Avatar } from '../ui/Avatar';
import { VeroLogo } from '../ui/VeroLogo';
import { springSoft } from '../../lib/motion';
import { cn } from '../../utils/cn';

interface NavEntry {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Reads the unread/pending count for the badge. */
  badge?: 'inbox';
}

// What is yours, across every project. Project work lives under Projects.
const PRIMARY_NAV: NavEntry[] = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/inbox', icon: Inbox, label: 'Inbox', badge: 'inbox' },
  { to: '/work', icon: CheckSquare, label: 'My work' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
];

/** How many projects the sidebar lists before "All projects" takes over. */
const SIDEBAR_PROJECTS = 6;

const SECONDARY_NAV: NavEntry[] = [
  { to: '/profile', icon: UserRound, label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const NavItem: React.FC<{
  entry: NavEntry;
  collapsed: boolean;
  badgeCount?: number;
  onClick?: () => void;
  /** Only highlight on this exact path, not the pages beneath it. */
  end?: boolean;
}> = ({ entry, collapsed, badgeCount = 0, onClick, end }) => {
  const { icon: Icon, label, to } = entry;

  return (
    <NavLink to={to} end={end} onClick={onClick} title={collapsed ? label : undefined} className="block">
      {({ isActive }) => (
        <div
          className={cn(
            'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
            collapsed && 'justify-center px-0',
            isActive
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {/* Shared layoutId slides the highlight between items instead of popping. */}
          {isActive && (
            <motion.span
              layoutId="sidebar-active"
              transition={springSoft}
              className="absolute inset-0 rounded-xl bg-muted border border-border"
            />
          )}

          <span className="relative flex items-center justify-center shrink-0">
            <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.3 : 1.9} />
            {collapsed && badgeCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </span>

          {!collapsed && <span className="relative truncate flex-1">{label}</span>}

          {!collapsed && badgeCount > 0 && (
            <span className="relative min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-2xs font-semibold flex items-center justify-center tabular-nums">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}

          {isActive && !collapsed && (
            <motion.span
              layoutId="sidebar-active-bar"
              transition={springSoft}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-accent"
            />
          )}
        </div>
      )}
    </NavLink>
  );
};

/** One project in the sidebar; it stays highlighted on any page inside it. */
const ProjectItem: React.FC<{
  id: string;
  name: string;
  collapsed: boolean;
  active: boolean;
  onClick?: () => void;
}> = ({ id, name, collapsed, active, onClick }) => (
  <NavLink to={projectHref(id)} onClick={onClick} title={collapsed ? name : undefined} className="block">
    <div
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-150',
        collapsed && 'justify-center px-0 py-2 rounded-xl',
        active ? 'text-foreground bg-muted font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <span
        className={cn(
          'w-[18px] h-[18px] rounded-md grid place-items-center shrink-0 text-[0.625rem] font-semibold uppercase',
          active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
        )}
        aria-hidden
      >
        {name.trim().charAt(0) || '?'}
      </span>
      {!collapsed && <span className="truncate flex-1">{name}</span>}
    </div>
  </NavLink>
);

function useSidebarData() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const incomingRequests = useInboxStore((state) => state.connections.incoming.length);
  const unreadMessages = useInboxStore((state) => state.totalUnread());
  const loadConnections = useInboxStore((state) => state.loadConnections);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  useEffect(() => {
    if (user?.id) {
      loadConnections();
      fetchProjects();
    }
  }, [user?.id, loadConnections, fetchProjects]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      /* the local session is cleared regardless */
    }
    clearAuth();
    navigate('/');
  };

  return { user, handleLogout, inboxBadge: incomingRequests + unreadMessages };
}

const SidebarBody: React.FC<{
  collapsed: boolean;
  inboxBadge: number;
  user: ReturnType<typeof useAuthStore.getState>['user'];
  onLogout: () => void;
  onNavigate?: () => void;
}> = ({ collapsed, inboxBadge, user, onLogout, onNavigate }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = location.pathname.match(/^\/project\/([^/]+)/)?.[1];

  // The open project always shows, even when it is not among the first few.
  const listed = projects.slice(0, SIDEBAR_PROJECTS);
  const openProject = projects.find((p) => p.id === activeProjectId);
  if (openProject && !listed.includes(openProject)) listed.push(openProject);

  return (
    <>
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 flex flex-col gap-1">
        {PRIMARY_NAV.map((entry) => (
          <NavItem
            key={entry.to}
            entry={entry}
            collapsed={collapsed}
            badgeCount={entry.badge === 'inbox' ? inboxBadge : 0}
            onClick={onNavigate}
          />
        ))}

        <div className="my-3 h-px bg-border mx-1" />

        <NavItem
          entry={{ to: '/projects', icon: FolderKanban, label: 'Projects' }}
          collapsed={collapsed}
          onClick={onNavigate}
          end
        />
        {/* Projects nest under their heading, with a guide line from its icon. */}
        <div className={cn('flex flex-col gap-1', !collapsed && 'ml-[1.3125rem] pl-2 border-l border-border')}>
          {listed.map((project) => (
            <ProjectItem
              key={project.id}
              id={project.id}
              name={project.name}
              collapsed={collapsed}
              active={project.id === activeProjectId}
              onClick={onNavigate}
            />
          ))}
          {!collapsed && projects.length > listed.length && (
            <NavLink
              to="/projects"
              onClick={onNavigate}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {projects.length - listed.length} more
            </NavLink>
          )}
        </div>

        <div className="my-3 h-px bg-border mx-1" />

        {SECONDARY_NAV.map((entry) => (
          <NavItem key={entry.to} entry={entry} collapsed={collapsed} onClick={onNavigate} />
        ))}
      </nav>

      <div className="border-t border-border p-3 flex flex-col gap-1">
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer',
            collapsed && 'justify-center px-0'
          )}
        >
          {theme === 'light' ? (
            <Moon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
          ) : (
            <Sun className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
          )}
          {!collapsed && <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
        </button>

        <button
          onClick={onLogout}
          title="Log out"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-danger hover:bg-danger-soft transition-colors cursor-pointer',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} />
          {!collapsed && <span>Log out</span>}
        </button>

        <button
          onClick={() => {
            navigate('/profile');
            onNavigate?.();
          }}
          className={cn(
            'mt-1 flex items-center gap-3 rounded-xl p-2 hover:bg-muted transition-colors cursor-pointer text-left',
            collapsed && 'justify-center'
          )}
        >
          <Avatar name={user?.name} src={user?.avatar} size="sm" />
          {!collapsed && (
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate">
                {user?.name || 'Your profile'}
              </span>
              <span className="text-xs text-subtle-foreground truncate">{user?.email || ''}</span>
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useNavigationStore();
  const { user, handleLogout, inboxBadge } = useSidebarData();

  return (
    <>
      <motion.aside
        animate={{ width: isSidebarCollapsed ? 68 : 264 }}
        transition={springSoft}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-card border-r border-border flex-col z-50"
      >
        <div
          className={cn(
            'h-16 flex items-center border-b border-border shrink-0 px-3',
            isSidebarCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {isSidebarCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-xl hover:bg-muted transition-colors shrink-0 cursor-pointer flex items-center justify-center group"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <VeroLogo
                variant="navbar-collapsed"
                size={32}
                className="group-hover:scale-105 transition-transform"
              />
            </button>
          ) : (
            <>
              <div className="flex items-center min-w-0">
                <VeroLogo variant="navbar-expanded" size={48} className="max-w-[150px]" />
              </div>
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <SidebarBody
          collapsed={isSidebarCollapsed}
          inboxBadge={inboxBadge}
          user={user}
          onLogout={handleLogout}
        />
      </motion.aside>

      <MobileSidebar inboxBadge={inboxBadge} user={user} onLogout={handleLogout} />
    </>
  );
};

const MobileSidebar: React.FC<{
  inboxBadge: number;
  user: ReturnType<typeof useAuthStore.getState>['user'];
  onLogout: () => void;
}> = ({ inboxBadge, user, onLogout }) => {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes, including via back/forward.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3.5 left-4 z-50 p-2 rounded-xl bg-card border border-border shadow-soft text-foreground hover:bg-muted transition-colors"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
        {inboxBadge > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 bg-black/55 backdrop-blur-sm z-[60]"
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="md:hidden fixed left-0 top-0 h-screen w-[280px] bg-card border-r border-border flex flex-col z-[70] shadow-lifted"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border shrink-0">
                <div className="flex items-center min-w-0">
                  <VeroLogo variant="navbar-expanded" size={36} className="max-w-[150px]" />
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <SidebarBody
                collapsed={false}
                inboxBadge={inboxBadge}
                user={user}
                onLogout={onLogout}
                onNavigate={() => setOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

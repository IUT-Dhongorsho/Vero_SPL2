import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, FolderKanban, LayoutDashboard, Settings, FileText, CheckSquare, CalendarDays, MessageSquare, Video } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  route: string;
  category: string;
}

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const allItems: SearchResult[] = [
    { id: 'nav-dashboard', title: 'Dashboard', icon: <LayoutDashboard />, route: '/dashboard', category: 'Navigation' },
    { id: 'nav-projects', title: 'Projects', icon: <FolderKanban />, route: '/projects', category: 'Navigation' },
    { id: 'nav-tasks', title: 'My Tasks', icon: <CheckSquare />, route: '/tasks', category: 'Navigation' },
    { id: 'nav-calendar', title: 'Calendar', icon: <CalendarDays />, route: '/calendar', category: 'Navigation' },
    { id: 'nav-files', title: 'Files', icon: <FileText />, route: '/files', category: 'Navigation' },
    { id: 'nav-settings', title: 'Settings', icon: <Settings />, route: '/settings', category: 'Navigation' },
    
    // Some mock projects/modules for wow-factor
    { id: 'proj-1', title: 'Vero SPL2', subtitle: 'Project', icon: <FolderKanban />, route: '/workspace/1/project/2', category: 'Projects' },
    { id: 'proj-2', title: 'Website Redesign', subtitle: 'Project', icon: <FolderKanban />, route: '/workspace/1/project/1', category: 'Projects' },
    
    { id: 'mod-1', title: 'Authentication System', subtitle: 'Module', icon: <FileText />, route: '/workspace/1/project/2/module/m1', category: 'Modules' },
    { id: 'mod-chat', title: 'Auth System Chat', subtitle: 'Module Chat', icon: <MessageSquare />, route: '/workspace/1/project/2/module/m1/chat', category: 'Modules' },
    { id: 'mod-meet', title: 'Auth System Meet', subtitle: 'Module Meet', icon: <Video />, route: '/workspace/1/project/2/module/m1/meet', category: 'Modules' },
  ];

  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  // Flatten for keyboard nav
  const flatItems = Object.values(groupedItems).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flatItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        navigate(flatItems[selectedIndex].route);
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />
        
        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Search Input */}
          <div className="flex items-center px-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks, projects, notes, or type a command..."
              className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-foreground placeholder:text-muted-foreground text-lg"
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md shrink-0">
              <span className="text-[10px]">ESC</span> to close
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {flatItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="mb-4 last:mb-0">
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((item) => {
                    const index = flatItems.findIndex(i => i.id === item.id);
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => {
                          navigate(item.route);
                          setIsOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-3 mx-1 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${isSelected ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'}`}>
                          {React.cloneElement(item.icon as React.ReactElement, { className: 'w-4 h-4' })}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.title}</span>
                          {item.subtitle && (
                            <span className={`text-xs ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {item.subtitle}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/30 px-4 py-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="bg-muted px-1.5 py-0.5 rounded border border-border">↑</span>
              <span className="bg-muted px-1.5 py-0.5 rounded border border-border">↓</span>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="bg-muted px-1.5 py-0.5 rounded border border-border">↵</span>
              <span>to select</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

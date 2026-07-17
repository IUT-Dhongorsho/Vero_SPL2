import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, Search, Grid3x3, List, FileText, Image, File, Code, X, LayoutDashboard, FolderKanban, CheckSquare, CalendarDays, Files as FilesIcon } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { EmptyState } from '../components/ui/EmptyState';
import { mockFiles, FileItem } from '../data/mockData';

export const FilesPage: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <FolderKanban className="w-4 h-4" />, label: 'Projects', href: '/projects' },
    { icon: <CheckSquare className="w-4 h-4" />, label: 'My Tasks', href: '/tasks' },
    { icon: <CalendarDays className="w-4 h-4" />, label: 'Calendar', href: '/calendar' },
    { icon: <FilesIcon className="w-4 h-4" />, label: 'Files', href: '/files', active: true },
  ];

  const filteredFiles = files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-8 h-8 text-blue-500" />;
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'code': return <Code className="w-8 h-8 text-purple-500" />;
      default: return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const handleUpload = () => alert('File upload would open here');
  const handleDownload = (file: FileItem) => alert(`Downloading ${file.name}`);
  return (
    <PageContainer title="Files" sidebarItems={sidebarItems} topBarActions={
      <div className="flex gap-3 items-center">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all w-64" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Grid3x3 className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-4 h-4" /></button>
        </div>
        <AnimatedButton variant="primary" size="sm" onClick={handleUpload}><Upload className="w-4 h-4 mr-1" />Upload</AnimatedButton>
        <ThemeToggle />
      </div>
    }>
      <div className="max-w-7xl mx-auto">
        {filteredFiles.length === 0 ? (
          <EmptyState type="files" actionLabel="Upload File" onAction={handleUpload} />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredFiles.map((file, index) => (
              <motion.div key={file.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }}>
                <div 
                  className="p-5 bg-card border border-border hover:border-primary/50 shadow-sm hover:shadow-md rounded-2xl text-center cursor-pointer transition-all group flex flex-col items-center relative" 
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-1.5 bg-background text-muted-foreground hover:text-primary rounded-lg border border-border shadow-sm"><Download className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl mb-4 transition-colors group-hover:bg-primary/5 text-primary">
                    {getFileIcon(file.type)}
                  </div>
                  <h4 className="font-medium text-sm text-foreground truncate w-full px-2">{file.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1.5">{file.size}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredFiles.map((file, index) => (
              <motion.div key={file.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
                <div 
                  className="px-4 py-3 bg-card border border-border hover:border-primary/50 shadow-sm rounded-xl flex items-center justify-between cursor-pointer transition-all group" 
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-primary/5 text-primary shrink-0">
                      {getFileIcon(file.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm text-foreground truncate">{file.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{file.projectName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0 ml-4">
                    <span className="text-sm text-muted-foreground hidden sm:block w-20 text-right">{file.size}</span>
                    <span className="text-sm text-muted-foreground hidden md:block w-32 truncate">{file.uploadedBy}</span>
                    <span className="text-sm text-muted-foreground hidden lg:block w-24 text-right">{file.uploadedAt}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="p-2 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"><Download className="w-4 h-4" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {selectedFile && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedFile(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-semibold text-foreground break-words pr-4">{selectedFile.name}</h3>
                  <button onClick={() => setSelectedFile(null)} className="p-1 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex justify-center py-8 mb-6 bg-muted/30 rounded-xl border border-border/50 text-primary">
                  {getFileIcon(selectedFile.type)}
                </div>
                <div className="space-y-3 mb-6 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span className="font-medium text-foreground">{selectedFile.size}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uploaded by</span><span className="font-medium text-foreground">{selectedFile.uploadedBy}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uploaded at</span><span className="font-medium text-foreground">{selectedFile.uploadedAt}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-medium text-foreground">{selectedFile.projectName}</span></div>
                </div>
                <AnimatedButton variant="primary" fullWidth onClick={() => handleDownload(selectedFile)}><Download className="w-4 h-4 mr-2" /> Download File</AnimatedButton>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  );
};

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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search files..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 glass rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex gap-1 glass rounded-lg p-1">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}><Grid3x3 className="w-4 h-4" /></button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
        </div>
        <AnimatedButton variant="primary" size="sm" onClick={handleUpload}><Upload className="w-4 h-4 mr-1" />Upload</AnimatedButton>
        <ThemeToggle />
      </div>
    }>
      {filteredFiles.length === 0 ? (
        <EmptyState type="files" actionLabel="Upload File" onAction={handleUpload} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file, index) => (
            <motion.div key={file.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} whileHover={{ y: -4 }}>
              <GlassCard className="p-4 text-center cursor-pointer" onClick={() => setSelectedFile(file)}>
                <div className="flex justify-center mb-3">{getFileIcon(file.type)}</div>
                <h4 className="font-semibold text-sm truncate">{file.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{file.size}</p>
                <p className="text-xs text-gray-400 mt-2">{file.uploadedBy} • {file.uploadedAt}</p>
                <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="mt-3 text-blue-500 hover:text-blue-600 transition-colors"><Download className="w-4 h-4 inline mr-1" /> Download</button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map((file, index) => (
            <motion.div key={file.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
              <GlassCard className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSelectedFile(file)}>
                <div className="flex items-center gap-3">
                  {getFileIcon(file.type)}
                  <div><h4 className="font-semibold">{file.name}</h4><p className="text-xs text-gray-500">{file.projectName}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{file.size}</span>
                  <span className="text-sm text-gray-500">{file.uploadedBy}</span>
                  <span className="text-sm text-gray-500">{file.uploadedAt}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(file); }} className="text-blue-500 hover:text-blue-600"><Download className="w-4 h-4" /></button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedFile && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedFile(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold">{selectedFile.name}</h3><button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button></div>
              <div className="text-center py-8">{getFileIcon(selectedFile.type)}</div>
              <div className="space-y-2 mb-6">
                <p><span className="text-gray-500">Size:</span> {selectedFile.size}</p>
                <p><span className="text-gray-500">Uploaded by:</span> {selectedFile.uploadedBy}</p>
                <p><span className="text-gray-500">Uploaded at:</span> {selectedFile.uploadedAt}</p>
                <p><span className="text-gray-500">Project:</span> {selectedFile.projectName}</p>
              </div>
              <AnimatedButton variant="primary" fullWidth onClick={() => handleDownload(selectedFile)}><Download className="w-4 h-4 mr-2" /> Download File</AnimatedButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

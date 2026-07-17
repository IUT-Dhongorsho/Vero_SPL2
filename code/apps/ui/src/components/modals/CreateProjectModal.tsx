import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Lock } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { toast } from '../Providers/ToastProvider';
import { projectService, CreateProjectData } from '../../services/projectService';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team'>('team');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    setLoading(true);
    try {
      await projectService.createProject({ name, description, visibility });
      toast.success('Project created successfully!');
      setName('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md p-4"
          >
            <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-foreground">Create New Project</h2>
                <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Project Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Q3 Marketing Push"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this project about?"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground resize-none"
                  />
                </div>

                <div className="pt-2 mb-6">
                  <label className="block text-sm font-medium text-foreground mb-3">Visibility</label>
                  <div className="flex gap-4">
                    <label className="flex-1 flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors group">
                      <input
                        type="radio"
                        value="team"
                        checked={visibility === 'team'}
                        onChange={() => setVisibility('team')}
                        className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"
                      />
                      <div className="flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
                        <Globe className="w-4 h-4" />
                        <span className="text-sm font-medium">Team</span>
                      </div>
                    </label>
                    <label className="flex-1 flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors group">
                      <input
                        type="radio"
                        value="private"
                        checked={visibility === 'private'}
                        onChange={() => setVisibility('private')}
                        className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"
                      />
                      <div className="flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
                        <Lock className="w-4 h-4" />
                        <span className="text-sm font-medium">Private</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <AnimatedButton type="button" variant="outline" fullWidth onClick={onClose}>
                    Cancel
                  </AnimatedButton>
                  <AnimatedButton type="submit" variant="primary" fullWidth loading={loading}>
                    Create Project
                  </AnimatedButton>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

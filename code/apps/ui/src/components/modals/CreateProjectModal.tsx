import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Globe, Lock } from 'lucide-react';
import { AnimatedButton } from '../ui/AnimatedButton';
import { toast } from '../ui/Toast';
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <div className="glass rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create New Project</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Project Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., SPL-II Development"
                    className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this project about?"
                    rows={3}
                    className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Visibility</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="team"
                        checked={visibility === 'team'}
                        onChange={() => setVisibility('team')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <Globe className="w-4 h-4" />
                      <span className="text-sm">Team</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="private"
                        checked={visibility === 'private'}
                        onChange={() => setVisibility('private')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Private</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
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

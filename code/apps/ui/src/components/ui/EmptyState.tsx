import React from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Calendar, FileText, Users } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

interface EmptyStateProps {
  type: 'tasks' | 'calendar' | 'files' | 'members' | 'projects';
  actionLabel?: string;
  onAction?: () => void;
}

const icons = {
  tasks: { icon: FolderOpen, title: 'No tasks yet', description: 'Tasks assigned to you will appear here' },
  calendar: { icon: Calendar, title: 'No events', description: 'Tasks with due dates will appear on the calendar' },
  files: { icon: FileText, title: 'No files', description: 'Upload files to share with your team' },
  members: { icon: Users, title: 'No members', description: 'Invite team members to collaborate' },
  projects: { icon: FolderOpen, title: 'No projects', description: 'Create your first project to get started' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type, actionLabel, onAction }) => {
  const { icon: Icon, title, description } = icons[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-16 px-4"
    >
      <div className="w-24 h-24 mx-auto mb-6 rounded-full glass flex items-center justify-center">
        <Icon className="w-12 h-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>
      {actionLabel && onAction && (
        <AnimatedButton variant="primary" onClick={onAction}>
          {actionLabel}
        </AnimatedButton>
      )}
    </motion.div>
  );
};

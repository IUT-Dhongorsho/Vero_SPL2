import React from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  FileText,
  FolderOpen,
  Inbox,
  MessageSquare,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';
import { EASE_OUT, springSoft } from '../../lib/motion';

type EmptyStateType =
  | 'tasks'
  | 'calendar'
  | 'files'
  | 'members'
  | 'projects'
  | 'inbox'
  | 'conversation';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const presets: Record<EmptyStateType, { icon: LucideIcon; title: string; description: string }> = {
  tasks: { icon: FolderOpen, title: 'Nothing on your plate', description: 'Tasks assigned to you will land here.' },
  calendar: { icon: Calendar, title: 'A clear week', description: 'Anything with a due date shows up on this calendar.' },
  files: { icon: FileText, title: 'No files yet', description: 'Share a file in a conversation and it will appear here.' },
  members: { icon: Users, title: 'Just you so far', description: 'Invite teammates to collaborate on this project.' },
  projects: { icon: FolderOpen, title: 'No projects yet', description: 'Create one, or join with an invite code.' },
  inbox: { icon: Inbox, title: 'Your inbox is quiet', description: 'Search for someone to start a conversation.' },
  conversation: { icon: MessageSquare, title: 'Pick a conversation', description: 'Choose someone on the left to start chatting.' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const preset = presets[type];
  const Icon = preset.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className={`text-center py-16 px-6 ${className}`}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springSoft, delay: 0.08 }}
        className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-accent-soft flex items-center justify-center"
      >
        <Icon className="w-9 h-9 text-accent" strokeWidth={1.6} />
      </motion.div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title ?? preset.title}</h3>
      <p className="text-muted-foreground max-w-sm mx-auto mb-7 leading-relaxed">
        {description ?? preset.description}
      </p>
      {actionLabel && onAction && (
        <AnimatedButton variant="primary" onClick={onAction}>
          {actionLabel}
        </AnimatedButton>
      )}
    </motion.div>
  );
};

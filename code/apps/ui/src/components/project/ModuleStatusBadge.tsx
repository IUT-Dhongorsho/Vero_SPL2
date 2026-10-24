import React from 'react';
import { Badge } from '../ui/Badge';
import type { ModuleStatus } from '../../services/moduleService';

export const MODULE_STATUS: Record<ModuleStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  'on-track': { label: 'On track', tone: 'success' },
  'at-risk': { label: 'At risk', tone: 'warning' },
  'off-track': { label: 'Off track', tone: 'danger' },
  completed: { label: 'Completed', tone: 'neutral' },
};

export const ModuleStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const entry = MODULE_STATUS[status as ModuleStatus] ?? MODULE_STATUS['on-track'];
  return (
    <Badge tone={entry.tone} dot>
      {entry.label}
    </Badge>
  );
};

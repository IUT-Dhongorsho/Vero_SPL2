import React, { useState } from 'react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { toast } from '../../components/Providers/ToastProvider';

export const WorkspaceTab: React.FC = () => {
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [slug, setSlug] = useState('my-workspace');
  const [visibility, setVisibility] = useState<'private' | 'team'>('team');
  const [permissions, setPermissions] = useState({
    createProjects: true,
    inviteMembers: true,
    restrictMeetings: false,
  });

  const handleSave = () => {
    toast.success('Workspace settings saved!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Workspace Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Workspace URL</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">vero.app/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Default Visibility</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  value="team"
                  checked={visibility === 'team'}
                  onChange={() => setVisibility('team')}
                  className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"
                />
                <span className="text-foreground font-medium group-hover:text-primary transition-colors">Team (members can see each other's projects)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="w-4 h-4 text-primary bg-background border-border focus:ring-primary"
                />
                <span className="text-foreground font-medium group-hover:text-primary transition-colors">Private (invite only)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">Permissions</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={permissions.createProjects}
              onChange={(e) => setPermissions({ ...permissions, createProjects: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <span className="text-foreground font-medium group-hover:text-primary transition-colors">Allow members to create projects</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={permissions.inviteMembers}
              onChange={(e) => setPermissions({ ...permissions, inviteMembers: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <span className="text-foreground font-medium group-hover:text-primary transition-colors">Allow members to invite new members</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={permissions.restrictMeetings}
              onChange={(e) => setPermissions({ ...permissions, restrictMeetings: e.target.checked })}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-background"
            />
            <span className="text-foreground font-medium group-hover:text-primary transition-colors">Restrict meetings to admins only</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <AnimatedButton variant="primary" onClick={handleSave}>
          Save Changes
        </AnimatedButton>
      </div>
    </div>
  );
};

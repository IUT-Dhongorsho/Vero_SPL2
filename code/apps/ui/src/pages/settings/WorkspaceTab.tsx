import React, { useState } from 'react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { toast } from '../../components/ui/Toast';

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
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">General Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Workspace Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Workspace URL</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">vero.app/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="flex-1 px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Default Visibility</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="team"
                  checked={visibility === 'team'}
                  onChange={() => setVisibility('team')}
                />
                <span>Team (members can see each other's projects)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                />
                <span>Private (invite only)</span>
              </label>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Permissions</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={permissions.createProjects}
              onChange={(e) => setPermissions({ ...permissions, createProjects: e.target.checked })}
            />
            <span>Allow members to create projects</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={permissions.inviteMembers}
              onChange={(e) => setPermissions({ ...permissions, inviteMembers: e.target.checked })}
            />
            <span>Allow members to invite new members</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={permissions.restrictMeetings}
              onChange={(e) => setPermissions({ ...permissions, restrictMeetings: e.target.checked })}
            />
            <span>Restrict meetings to admins only</span>
          </label>
        </div>
      </GlassCard>

      <div className="flex justify-end">
        <AnimatedButton variant="primary" onClick={handleSave}>
          Save Changes
        </AnimatedButton>
      </div>
    </div>
  );
};

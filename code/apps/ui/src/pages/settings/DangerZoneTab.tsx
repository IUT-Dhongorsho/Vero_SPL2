import React, { useState } from 'react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { toast } from '../../components/Providers/ToastProvider';
import { AlertTriangle } from 'lucide-react';

export const DangerZoneTab: React.FC = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = () => {
    if (confirmText === 'delete my workspace') {
      toast.error('Workspace deleted (demo)');
      setShowConfirm(false);
      setConfirmText('');
    } else {
      toast.error('Please type "delete my workspace" to confirm');
    }
  };

  return (
    <div>
      <GlassCard className="p-6 border-2 border-red-500/50">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-red-500">Danger Zone</h3>
        </div>
        <p className="text-gray-500 mb-4">
          Once you delete a workspace, there is no going back. All projects, tasks, files, and members will be lost forever.
        </p>
        <AnimatedButton variant="danger" onClick={() => setShowConfirm(true)}>
          Delete Workspace
        </AnimatedButton>
      </GlassCard>

      {/* Confirm Delete Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-center mb-2">Delete Workspace?</h3>
            <p className="text-gray-500 text-center mb-4">
              This action cannot be undone. Type <strong className="text-red-500">"delete my workspace"</strong> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete my workspace"
              className="w-full px-4 py-2 glass rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
            />
            <div className="flex gap-3">
              <AnimatedButton variant="outline" fullWidth onClick={() => setShowConfirm(false)}>
                Cancel
              </AnimatedButton>
              <AnimatedButton variant="danger" fullWidth onClick={handleDelete}>
                Delete Forever
              </AnimatedButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

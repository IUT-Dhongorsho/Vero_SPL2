import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Field, inputClass } from '../ui/Field';
import { AnimatedButton } from '../ui/AnimatedButton';
import { useProjectStore } from '../../stores/project.store';
import { toast } from '../Providers/ToastProvider';
import { errorMessage } from '../../utils/errors';

interface JoinProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinProjectModal: React.FC<JoinProjectModalProps> = ({ isOpen, onClose }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinProject = useProjectStore((s) => s.joinProject);
  const navigate = useNavigate();

  const close = () => {
    setInviteCode('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await joinProject(inviteCode.trim().toUpperCase());
      toast.success('You joined the project');
      close();
      navigate(`/project/${res.projectId}`);
    } catch (err: any) {
      // Already a member: just take them there.
      if (err?.response?.status === 409 && err.response.data?.projectId) {
        close();
        navigate(`/project/${err.response.data.projectId}`);
        return;
      }
      setError(errorMessage(err, 'That code did not work. Check it and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={close}
      title="Join a project"
      description="Ask a project admin for its six-character invite code."
      size="sm"
      footer={
        <>
          <AnimatedButton variant="secondary" onClick={close}>
            Cancel
          </AnimatedButton>
          <AnimatedButton type="submit" form="join-project" variant="primary" loading={loading} disabled={inviteCode.trim().length < 4}>
            Join project
          </AnimatedButton>
        </>
      }
    >
      <form id="join-project" onSubmit={handleSubmit}>
        <Field label="Invite code" error={error}>
          {(props) => (
            <input
              {...props}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ABC123"
              maxLength={12}
              autoComplete="off"
              className={`${inputClass} font-mono text-lg tracking-[0.3em] uppercase`}
            />
          )}
        </Field>
      </form>
    </Modal>
  );
};

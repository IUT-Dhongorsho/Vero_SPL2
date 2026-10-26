import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Modal } from '../../components/ui/Modal';
import { Field, inputClass } from '../../components/ui/Field';
import { toast } from '../../components/Providers/ToastProvider';
import { authClient } from '../../lib/auth-client';
import { projectService, type Project } from '../../services/projectService';
import { useAuthStore } from '../../stores/auth.store';
import { errorMessage } from '../../utils/errors';
import { SettingsSection } from './SettingsSection';

const PHRASE = 'delete my account';

export const DeleteAccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [soleAdminOf, setSoleAdminOf] = useState<Project[]>([]);

  // Projects that would be left without an admin deserve a warning first.
  useEffect(() => {
    if (!open) return;
    (async () => {
      const projects = await projectService.getProjects().catch(() => []);
      const risky: Project[] = [];
      for (const p of projects.filter((p) => p.userRole === 'admin' && p.memberCount > 1)) {
        const members = await projectService.getMembers(p.id).catch(() => []);
        if (members.filter((m) => m.role === 'admin').length === 1) risky.push(p);
      }
      setSoleAdminOf(risky);
    })();
  }, [open]);

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await authClient.deleteUser({ password });
      if (error) throw new Error(error.message);
      clearAuth();
      toast.success('Your account was deleted');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, 'Could not delete your account'));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setPassword('');
    setTyped('');
  };

  return (
    <SettingsSection
      tone="danger"
      title="Delete account"
      description="Removes your account and signs you out everywhere. Projects you belong to keep their content."
    >
      <AnimatedButton variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </AnimatedButton>

      <Modal
        open={open}
        onClose={close}
        title="Delete your account?"
        description="This cannot be undone. Your messages and files stay in the projects you shared them with."
        footer={
          <>
            <AnimatedButton variant="secondary" onClick={close} disabled={busy}>
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              form="delete-account"
              variant="danger"
              loading={busy}
              disabled={!password || typed.trim().toLowerCase() !== PHRASE}
            >
              Delete account
            </AnimatedButton>
          </>
        }
      >
        <form id="delete-account" onSubmit={remove} className="space-y-4">
          {soleAdminOf.length > 0 && (
            <div className="rounded-xl bg-warning-soft text-warning px-4 py-3 text-sm leading-relaxed">
              You are the only admin of{' '}
              {soleAdminOf.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && ', '}
                  <Link to={`/project/${p.id}?tab=members`} className="font-semibold underline" onClick={close}>
                    {p.name}
                  </Link>
                </React.Fragment>
              ))}
              . Make someone else an admin first, or nobody will be able to manage {soleAdminOf.length === 1 ? 'it' : 'them'}.
            </div>
          )}
          <Field label="Your password">
            {(props) => (
              <input {...props} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
            )}
          </Field>
          <Field label={`Type “${PHRASE}” to confirm`}>
            {(props) => <input {...props} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={inputClass} />}
          </Field>
        </form>
      </Modal>
    </SettingsSection>
  );
};

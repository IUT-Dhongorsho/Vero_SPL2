import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Field, inputClass } from '../../components/ui/Field';
import { GithubIcon } from '../../components/ui/BrandIcons';
import { GoogleMark } from '../auth/AuthShell';
import { toast } from '../../components/Providers/ToastProvider';
import { authClient } from '../../lib/auth-client';
import { useAuthStore } from '../../stores/auth.store';
import { errorMessage } from '../../utils/errors';
import { SettingsSection } from './SettingsSection';

interface LinkedAccount {
  providerId: string;
}

const PROVIDERS: { id: 'google' | 'github'; label: string; icon: React.ReactNode }[] = [
  { id: 'google', label: 'Google', icon: <GoogleMark /> },
  { id: 'github', label: 'GitHub', icon: <GithubIcon className="w-4 h-4" /> },
];

export const AccountSettings: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<LinkedAccount[] | null>(null);

  useEffect(() => setName(user?.name ?? ''), [user?.name]);

  useEffect(() => {
    authClient
      .listAccounts()
      .then(({ data }) => setAccounts(((data as unknown) as LinkedAccount[]) ?? []))
      .catch(() => setAccounts([]));
  }, []);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) throw new Error(error.message);
      setUser({ ...user, name: name.trim() });
      toast.success('Name updated');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not update your name'));
    } finally {
      setSaving(false);
    }
  };

  const connect = async (provider: 'google' | 'github') => {
    const { error } = await authClient.linkSocial({
      provider,
      callbackURL: `${window.location.origin}/settings?section=account`,
    });
    if (error) toast.error(error.message || `Could not connect ${provider}`);
  };

  return (
    <div className="space-y-5">
      <SettingsSection title="Your name" description="Shown to everyone you work with.">
        <form onSubmit={saveName} className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-xl">
          <Field label="Name" className="flex-1">
            {(props) => <input {...props} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={inputClass} />}
          </Field>
          <AnimatedButton type="submit" variant="primary" loading={saving} disabled={!name.trim() || name.trim() === user?.name}>
            Save
          </AnimatedButton>
        </form>
        <p className="text-sm text-muted-foreground mt-4">
          Bio, links and photo live on your{' '}
          <Link to="/profile?tab=edit" className="text-accent font-medium hover:underline">
            profile
          </Link>
          .
        </p>
      </SettingsSection>

      <SettingsSection title="Email" description="The address you sign in with and get notifications at.">
        <p className="text-foreground font-medium break-all">{user?.email}</p>
      </SettingsSection>

      <SettingsSection title="Sign-in methods" description="Connecting Google also lets Home show your Gmail inbox.">
        <ul className="space-y-2 max-w-xl">
          <li className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border">
            <span className="text-sm font-medium text-foreground">Email and password</span>
            {accounts === null ? (
              <span className="w-16 h-4 rounded skeleton-shimmer" />
            ) : accounts.some((a) => a.providerId === 'credential') ? (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <Check className="w-4 h-4" /> Set up
              </span>
            ) : (
              <Link to="/forgot-password" className="text-sm font-medium text-accent hover:underline">
                Set a password
              </Link>
            )}
          </li>
          {PROVIDERS.map(({ id, label, icon }) => {
            const linked = accounts?.some((a) => a.providerId === id);
            return (
              <li key={id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border">
                <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                  {icon} {label}
                </span>
                {accounts === null ? (
                  <span className="w-16 h-4 rounded skeleton-shimmer" />
                ) : linked ? (
                  <span className="flex items-center gap-1.5 text-sm text-success">
                    <Check className="w-4 h-4" /> Connected
                  </span>
                ) : (
                  <AnimatedButton size="sm" variant="secondary" onClick={() => connect(id)}>
                    Connect
                  </AnimatedButton>
                )}
              </li>
            );
          })}
        </ul>
      </SettingsSection>
    </div>
  );
};

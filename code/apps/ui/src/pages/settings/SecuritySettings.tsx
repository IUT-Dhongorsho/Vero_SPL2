import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { AnimatedButton } from '../../components/ui/AnimatedButton';
import { Badge } from '../../components/ui/Badge';
import { Field, inputClass } from '../../components/ui/Field';
import { toast } from '../../components/Providers/ToastProvider';
import { authClient } from '../../lib/auth-client';
import { timeAgo } from '../../utils/dateUtils';
import { errorMessage } from '../../utils/errors';
import { SettingsSection } from './SettingsSection';

interface SessionRow {
  id: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** "Chrome on macOS" from a user-agent string. */
function describeDevice(ua?: string | null) {
  if (!ua) return { label: 'Unknown device', mobile: false };
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Electron/.test(ua) ? 'Vero desktop' : 'A browser';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'an unknown system';
  return { label: `${browser} on ${os}`, mobile: /iPhone|iPad|Android/.test(ua) };
}

const PasswordForm: React.FC = () => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [saving, setSaving] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch || tooShort || !current || !next) return;
    setSaving(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: signOutOthers,
      });
      if (error) throw new Error(error.message);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success(signOutOthers ? 'Password changed — other devices were signed out' : 'Password changed');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change your password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 max-w-md">
      <Field label="Current password">
        {(props) => (
          <input {...props} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
        )}
      </Field>
      <Field label="New password" hint="At least 8 characters." error={tooShort ? 'Use at least 8 characters.' : null}>
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
        )}
      </Field>
      <Field label="Repeat new password" error={mismatch ? 'The two passwords are different.' : null}>
        {(props) => (
          <input {...props} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
        )}
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
        <input type="checkbox" checked={signOutOthers} onChange={(e) => setSignOutOthers(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
        Sign out everywhere else
      </label>
      <AnimatedButton type="submit" variant="primary" loading={saving} disabled={!current || !next || !confirm || mismatch || tooShort}>
        Change password
      </AnimatedButton>
    </form>
  );
};

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [list, me] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
    setCurrentToken(me.data?.session.token ?? null);
    const rows = ((list.data as unknown) as SessionRow[]) ?? [];
    rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    setSessions(rows);
  }, []);

  useEffect(() => {
    load().catch(() => setSessions([]));
  }, [load]);

  const revoke = async (session: SessionRow) => {
    setBusy(session.id);
    try {
      const { error } = await authClient.revokeSession({ token: session.token });
      if (error) throw new Error(error.message);
      await load();
      toast.success('Signed that device out');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not sign that device out'));
    } finally {
      setBusy(null);
    }
  };

  const revokeOthers = async () => {
    setBusy('others');
    try {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message);
      await load();
      toast.success('Signed out everywhere else');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not sign the other devices out'));
    } finally {
      setBusy(null);
    }
  };

  if (sessions === null) {
    return (
      <div className="space-y-2 max-w-xl">
        {[0, 1].map((i) => (
          <div key={i} className="h-14 rounded-xl skeleton-shimmer" />
        ))}
      </div>
    );
  }

  const others = sessions.filter((s) => s.token !== currentToken);

  return (
    <div className="max-w-xl space-y-3">
      <ul className="divide-y divide-border border border-border rounded-xl">
        {sessions.map((session) => {
          const device = describeDevice(session.userAgent);
          const Icon = device.mobile ? Smartphone : Monitor;
          const isCurrent = session.token === currentToken;
          return (
            <li key={session.id} className="flex items-center gap-3 px-4 py-3">
              <Icon className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.8} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  {device.label}
                  {isCurrent && <Badge tone="success">This device</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  Signed in {timeAgo(String(session.createdAt))}
                  {session.ipAddress ? `, from ${session.ipAddress}` : ''}
                </p>
              </div>
              {!isCurrent && (
                <AnimatedButton size="sm" variant="ghost" loading={busy === session.id} onClick={() => revoke(session)}>
                  Sign out
                </AnimatedButton>
              )}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <AnimatedButton size="sm" variant="secondary" loading={busy === 'others'} onClick={revokeOthers}>
          Sign out of {others.length} other {others.length === 1 ? 'device' : 'devices'}
        </AnimatedButton>
      )}
    </div>
  );
};

export const SecuritySettings: React.FC = () => (
  <div className="space-y-5">
    <SettingsSection title="Password" description="Signed in with Google only? Use “Set a password” under Account instead.">
      <PasswordForm />
    </SettingsSection>
    <SettingsSection title="Where you’re signed in" description="Sign out any device you don’t recognise.">
      <Sessions />
    </SettingsSection>
  </div>
);

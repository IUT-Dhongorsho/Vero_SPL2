import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AuthError, AuthField, AuthShell } from './auth/AuthShell';
import { toast } from '../components/Providers/ToastProvider';
import { authClient } from '../lib/auth-client';
import { useAuthStore } from '../stores/auth.store';

/** Where the reset email lands: `/reset-password?token=…`. */
export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const token = params.get('token');
  // Better Auth sends people back with ?error=INVALID_TOKEN when the link is stale.
  const linkError = params.get('error');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const footer = (
    <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-accent font-medium hover:underline">
      <ArrowLeft className="w-4 h-4" />
      Back to sign in
    </Link>
  );

  if (!token || linkError) {
    return (
      <AuthShell title="This link no longer works" subtitle="Reset links work once and expire after an hour." footer={footer}>
        <AnimatedButton variant="primary" size="lg" fullWidth onClick={() => navigate('/forgot-password')}>
          Send a new link
        </AnimatedButton>
      </AuthShell>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords are different.');
    setLoading(true);
    setError(null);
    const { error: failure } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (failure) {
      setError(
        failure.code === 'INVALID_TOKEN' || failure.status === 400
          ? 'This link has expired or was already used. Ask for a new one.'
          : failure.message || 'Your password could not be changed.'
      );
      return;
    }
    // Every session ends on reset; start this one clean.
    clearAuth();
    toast.success('Password changed — sign in with your new password');
    navigate('/login', { replace: true });
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Signing in with it ends every other session." footer={footer}>
      <form onSubmit={submit} className="space-y-5">
        {error && <AuthError message={error} />}
        <AuthField
          label="New password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <AuthField label="Repeat it" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" required />
        <AnimatedButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Save new password
        </AnimatedButton>
      </form>
    </AuthShell>
  );
};

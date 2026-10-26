import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { authClient } from '../lib/auth-client';
import { useAuthStore } from '../stores/auth.store';

/**
 * Where Google/GitHub sign-in returns. Better Auth has already set the session
 * cookie; this page only confirms it with the server and loads the user —
 * nothing in the URL is trusted as identity.
 */
export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(params.get('error'));

  useEffect(() => {
    if (params.get('error')) return;
    (async () => {
      const { data, error: failure } = await authClient.getSession();
      if (failure || !data) {
        setError('The sign-in did not finish. Try again.');
        return;
      }
      setAuth(
        { id: data.user.id, name: data.user.name, email: data.user.email, avatar: data.user.image || undefined },
        (data.session as any)?.authToken || data.session.token
      );
      navigate(params.get('next') || '/dashboard', { replace: true });
    })();
  }, [navigate, params, setAuth]);

  return (
    <div className="min-h-screen bg-background grid place-items-center p-4">
      {error ? (
        <div className="surface rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-foreground mb-2">Sign-in didn’t work</h1>
          <p className="text-muted-foreground mb-6">
            {error === 'access_denied' ? 'Access was declined at the provider.' : error.replace(/_/g, ' ')}
          </p>
          <AnimatedButton variant="primary" onClick={() => navigate('/login', { replace: true })}>
            Back to sign in
          </AnimatedButton>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="font-medium text-foreground">Finishing sign-in…</p>
        </div>
      )}
    </div>
  );
};

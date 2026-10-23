import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GithubIcon } from '../components/ui/BrandIcons';
import { authService } from '../services/authService';
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthShell,
  GoogleMark,
  SocialButton,
} from './auth/AuthShell';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, token } = await authService.login({ email, password });
      authService.setToken(token);
      authService.setUser(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      try {
        await authService.signup({
          name: 'Demo User',
          email: 'demo@vero.com',
          password: 'password123',
        });
      } catch {
        // already registered
      }
      const { user, token } = await authService.login({
        email: 'demo@vero.com',
        password: 'password123',
      });
      authService.setToken(token);
      authService.setUser(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const social = (provider: 'google' | 'github') => async () => {
    setError('');
    setLoading(true);
    try {
      await authService.loginWithSocial(provider);
    } catch (err: any) {
      setError(err.message || `Could not start ${provider} sign-in`);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      footer={
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent font-medium hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@company.com"
          autoComplete="email"
          required
        />

        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
          trailing={
            <Link to="/forgot-password" className="text-sm text-accent hover:underline">
              Forgot password?
            </Link>
          }
        />

        {error && <AuthError message={error} />}

        <AnimatedButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Sign in
        </AnimatedButton>
      </form>

      <div className="mt-4 p-3 rounded-xl bg-accent-soft border border-accent/20 text-xs flex justify-between items-center">
        <div>
          <span className="font-semibold block text-foreground">Local testing?</span>
          <span className="text-muted-foreground">One-click demo login</span>
        </div>
        <button
          type="button"
          onClick={handleDemoLogin}
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity"
          disabled={loading}
        >
          Demo Login
        </button>
      </div>

      <AuthDivider />

      <div className="flex gap-3">
        <SocialButton onClick={social('google')} disabled={loading}>
          <GoogleMark />
          Google
        </SocialButton>
        <SocialButton onClick={social('github')} disabled={loading}>
          <GithubIcon className="w-[18px] h-[18px]" />
          GitHub
        </SocialButton>
      </div>
    </AuthShell>
  );
};

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

/** Rough strength signal — length plus character variety. */
function strengthOf(password: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', tone: 'bg-danger' };
  if (score <= 3) return { score, label: 'Fair', tone: 'bg-warning' };
  return { score, label: 'Strong', tone: 'bg-success' };
}

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = strengthOf(password);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name || !email || !password) return setError('Please fill in all required fields');
    if (password.length < 8) return setError('Passwords must be at least 8 characters');
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (!agreeTerms) return setError('Please agree to the Terms of Service');

    setLoading(true);
    try {
      const { user, token } = await authService.signup({ name, email, password });
      authService.setToken(token);
      authService.setUser(user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
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
      setError(err.message || `Could not start ${provider} sign-up`);
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Everything your team is working on, in one place."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Full name"
          value={name}
          onChange={setName}
          placeholder="Your name"
          autoComplete="name"
          required
        />

        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@company.com"
          autoComplete="email"
          required
        />

        <div>
          <AuthField
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
          {password && (
            <div className="mt-2.5 flex items-center gap-3">
              <span className="flex-1 flex gap-1">
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index < strength.score ? strength.tone : 'bg-muted'
                    }`}
                  />
                ))}
              </span>
              <span className="text-xs text-muted-foreground w-12 text-right">{strength.label}</span>
            </div>
          )}
        </div>

        <AuthField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Type it again"
          autoComplete="new-password"
          required
        />

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border accent-[var(--accent)]"
          />
          <span className="text-sm text-muted-foreground leading-relaxed">
            I agree to the Terms of Service and Privacy Policy.
          </span>
        </label>

        {error && <AuthError message={error} />}

        <AnimatedButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Create account
        </AnimatedButton>
      </form>

      <AuthDivider label="Or sign up with" />

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

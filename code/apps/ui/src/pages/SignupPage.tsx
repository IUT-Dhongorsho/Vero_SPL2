import React, { useState } from 'react';
import { Button } from '../components/Common/Button';
import { Input } from '../components/Common/Input';

interface SignupPageProps {
  onSignup: (name: string, email: string, password: string) => void;
  onSwitchToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignup, onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubHandle, setGithubHandle] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (!agreeTerms) {
      alert('Please agree to the Terms of Service');
      return;
    }
    onSignup(name, email, password);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '48px',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Create an account</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Enter your details to set up your workspace profile</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email address"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="GitHub handle"
            type="text"
            placeholder="janedoe"
            value={githubHandle}
            onChange={(e) => setGithubHandle(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span style={{ fontSize: '14px' }}>
              I agree to the Terms of Service and Privacy Policy.
            </span>
          </label>
          <Button type="submit" variant="primary" fullWidth>
            Sign Up →
          </Button>
        </form>

        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            paddingTop: '24px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

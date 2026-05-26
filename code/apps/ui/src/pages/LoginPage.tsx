import React, { useState } from 'react';
import { Button } from '../components/Common/Button';
import { Input } from '../components/Common/Input';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToSignup: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
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
          maxWidth: '480px',
          width: '100%',
          padding: '48px',
          borderRadius: 'var(--radius-2xl)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Sign in to your SPL Workspace</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Email address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span style={{ fontSize: '14px' }}>Remember me</span>
            </label>
            <a href="#" style={{ fontSize: '14px', color: 'var(--primary)', textDecoration: 'none' }}>
              Forgot password?
            </a>
          </div>
          <Button type="submit" variant="primary" fullWidth>
            Sign In
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
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

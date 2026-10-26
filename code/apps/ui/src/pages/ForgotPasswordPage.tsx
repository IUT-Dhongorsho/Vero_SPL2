import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AuthError, AuthField, AuthShell } from './auth/AuthShell';
import { authClient } from '../lib/auth-client';
import { springSoft } from '../lib/motion';

const backToSignIn = (
  <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-accent font-medium hover:underline">
    <ArrowLeft className="w-4 h-4" />
    Back to sign in
  </Link>
);

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    // The answer is the same whether or not the address has an account, so
    // this page cannot be used to find out who is registered.
    const { error: failure } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (failure && failure.status === 429) {
      setError('Too many reset requests. Wait a few minutes and try again.');
      return;
    }
    if (failure && failure.status !== 404) {
      setError(failure.message || 'The reset link could not be sent. Try again in a moment.');
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If ${email} has a Vero account, a reset link is on its way.`}
        footer={backToSignIn}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSoft}
          className="surface rounded-2xl p-8 text-center"
        >
          <span className="w-16 h-16 rounded-2xl bg-success-soft text-success grid place-items-center mx-auto mb-5">
            <MailCheck className="w-8 h-8" strokeWidth={1.7} />
          </span>
          <p className="text-foreground font-medium">Link sent</p>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            It works once and expires in an hour. If nothing arrives in a few minutes, check your spam folder or{' '}
            <button onClick={() => setSubmitted(false)} className="text-accent font-medium hover:underline">
              send it again
            </button>
            .
          </p>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you sign in with and we’ll send you a link to choose a new password."
      footer={backToSignIn}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <AuthError message={error} />}
        <AuthField
          label="Email address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="name@company.com"
          autoComplete="email"
          required
        />
        <AnimatedButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Send reset link
        </AnimatedButton>
      </form>
    </AuthShell>
  );
};

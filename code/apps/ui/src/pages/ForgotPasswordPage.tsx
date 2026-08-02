import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { AuthField, AuthShell } from './auth/AuthShell';
import { springSoft } from '../lib/motion';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    // The reset mail itself is sent by the notification service once wired up;
    // the response is deliberately identical whether or not the address exists.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`If an account exists for ${email}, a reset link is on its way.`}
        footer={
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-accent font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        }
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
            The link expires in an hour. Check your spam folder if it does not arrive.
          </p>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a link to set a new one."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-accent font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
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
        <AnimatedButton type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Send reset link
        </AnimatedButton>
      </form>
    </AuthShell>
  );
};

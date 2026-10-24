import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Inbox, LayoutGrid, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { EASE_OUT, fadeUp, stagger } from '../../lib/motion';

const HIGHLIGHTS = [
  { icon: Inbox, title: 'Talk in one place', body: 'Direct messages and file transfer, no extra tab.' },
  { icon: LayoutGrid, title: 'See your whole plate', body: 'Every task assigned to you on one board.' },
  { icon: CalendarDays, title: 'Never miss a deadline', body: 'Project and personal due dates on one calendar.' },
];

/**
 * Shared frame for login / signup / password reset: a marketing panel on the
 * left, the form on the right, both driven by the app's own theme tokens.
 */
export const AuthShell: React.FC<{
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen bg-background flex">
    {/* Marketing side — hidden on small screens where it would just push the form down. */}
    <aside className="hidden lg:flex w-[46%] xl:w-1/2 relative overflow-hidden border-r border-border">
      <div className="absolute inset-0 grid-backdrop opacity-60" />
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-accent/12 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-accent/8 blur-3xl" />

      <motion.div
        variants={stagger(0.1, 0.09)}
        initial="hidden"
        animate="show"
        className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold">
            V
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">Vero</span>
        </motion.div>

        <div className="max-w-md">
          <motion.h2
            variants={fadeUp}
            className="text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.1] text-foreground"
          >
            Your team's work,
            <br />
            <span className="text-gradient animate-gradient-pan">in one workspace.</span>
          </motion.h2>

          <motion.div variants={stagger(0.2, 0.08)} className="mt-12 space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title: heading, body }) => (
              <motion.div key={heading} variants={fadeUp} className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={1.9} />
                </span>
                <span>
                  <span className="block font-medium text-foreground">{heading}</span>
                  <span className="block text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    {body}
                  </span>
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.p variants={fadeUp} className="text-sm text-subtle-foreground inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Chat, boards, notes and meetings — one place.
        </motion.p>
      </motion.div>
    </aside>

    {/* Form side */}
    <main className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-5 lg:justify-end">
        <Link to="/" className="lg:hidden flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-sm">
            V
          </span>
          <span className="font-semibold tracking-tight text-foreground">Vero</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 flex items-center justify-center px-5 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="w-full max-w-[26rem]"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-2 leading-relaxed">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 pt-6 border-t border-border text-center">{footer}</div>}
        </motion.div>
      </div>
    </main>
  </div>
);

export const AuthField: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  trailing?: React.ReactNode;
  minLength?: number;
}> = ({ label, type = 'text', value, onChange, placeholder, autoComplete, required, trailing, minLength }) => {
  const id = React.useId();
  return (
  <div>
    <div className="flex items-baseline justify-between mb-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      {trailing}
    </div>
    <input
      id={id}
      minLength={minLength}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      required={required}
      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-subtle-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft transition-all"
    />
  </div>
  );
};

export const SocialButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex-1 inline-flex items-center justify-center gap-2.5 px-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground bg-card hover:bg-muted hover:border-border-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
  >
    {children}
  </button>
);

export const GoogleMark = () => (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export const AuthDivider: React.FC<{ label?: string }> = ({ label = 'Or continue with' }) => (
  <div className="relative my-7">
    <span className="absolute inset-0 flex items-center" aria-hidden>
      <span className="w-full border-t border-border" />
    </span>
    <span className="relative flex justify-center">
      <span className="px-3 bg-background text-sm text-subtle-foreground">{label}</span>
    </span>
  </div>
);

export const AuthError: React.FC<{ message: string }> = ({ message }) => (
  <motion.p
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    role="alert"
    className="text-sm text-danger bg-danger-soft rounded-xl px-4 py-3"
  >
    {message}
  </motion.p>
);

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, KeyRound, Palette, Trash2, UserRound } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { springSoft } from '../lib/motion';
import { cn } from '../utils/cn';
import { AccountSettings } from './settings/AccountSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { DeleteAccountSettings } from './settings/DeleteAccountSettings';

type Section = 'account' | 'security' | 'notifications' | 'appearance' | 'delete';

const SECTIONS: { id: Section; label: string; icon: typeof UserRound; component: React.FC }[] = [
  { id: 'account', label: 'Account', icon: UserRound, component: AccountSettings },
  { id: 'security', label: 'Password & sessions', icon: KeyRound, component: SecuritySettings },
  { id: 'notifications', label: 'Notifications', icon: Bell, component: NotificationSettings },
  { id: 'appearance', label: 'Appearance', icon: Palette, component: AppearanceSettings },
  { id: 'delete', label: 'Delete account', icon: Trash2, component: DeleteAccountSettings },
];

export const SettingsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const active = SECTIONS.find((s) => s.id === params.get('section')) ?? SECTIONS[0];
  const Active = active.component;

  return (
    <PageContainer title="Settings" subtitle="Your account on Vero">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <nav aria-label="Settings" className="md:w-56 shrink-0">
          <ul className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const on = active.id === id;
              return (
                <li key={id} className="shrink-0">
                  <button
                    onClick={() => setParams(id === 'account' ? {} : { section: id }, { replace: true })}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                      on ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      id === 'delete' && !on && 'hover:text-danger'
                    )}
                  >
                    {on && (
                      <motion.span layoutId="settings-active" transition={springSoft} className="absolute inset-0 rounded-xl bg-muted border border-border" />
                    )}
                    <Icon className="relative w-4 h-4" strokeWidth={on ? 2.2 : 1.9} />
                    <span className="relative">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">
          <Active />
        </div>
      </div>
    </PageContainer>
  );
};

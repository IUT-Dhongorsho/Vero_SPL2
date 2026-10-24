import React from 'react';
import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../../components/Providers/ThemeProvider';
import { cn } from '../../utils/cn';
import { SettingsSection } from './SettingsSection';

const OPTIONS: { id: ThemePreference; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Match system', icon: Laptop },
];

export const AppearanceSettings: React.FC = () => {
  const { preference, setPreference } = useTheme();
  return (
    <SettingsSection title="Theme" description="Saved on this device.">
      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3 max-w-md">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const on = preference === id;
          return (
            <button
              key={id}
              role="radio"
              aria-checked={on}
              onClick={() => setPreference(id)}
              className={cn(
                'flex flex-col items-center gap-2 py-4 rounded-xl border transition-colors',
                on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </SettingsSection>
  );
};

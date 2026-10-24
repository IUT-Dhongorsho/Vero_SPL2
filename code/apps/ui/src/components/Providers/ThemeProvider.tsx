import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

interface ThemeContextType {
  /** What is on screen right now. */
  theme: Theme;
  /** What the person chose — `system` follows the operating system. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const systemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
}

/** Also run before React mounts (main.tsx) so the first paint is already right. */
export function applyStoredTheme() {
  const preference = readPreference();
  document.documentElement.classList.toggle('dark', (preference === 'system' ? systemTheme() : preference) === 'dark');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [theme, setTheme] = useState<Theme>(() => (readPreference() === 'system' ? systemTheme() : (readPreference() as Theme)));

  useEffect(() => {
    const resolve = () => {
      const next = preference === 'system' ? systemTheme() : preference;
      setTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
    };
    resolve();
    if (preference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', resolve);
    return () => media.removeEventListener('change', resolve);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private mode: the choice lasts for this visit */
    }
  }, []);

  const toggleTheme = useCallback(() => setPreference(theme === 'light' ? 'dark' : 'light'), [theme, setPreference]);

  return <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

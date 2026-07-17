import React from 'react';
import { useTheme } from './Providers/ThemeProvider';

export const ThemeDebug: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white rounded-lg px-3 py-2 text-xs flex items-center gap-2 font-mono">
      <span>🎨 Theme: <strong>{theme}</strong></span>
      <span>|</span>
      <span>📄 HTML class: <strong>{document.documentElement.classList.contains('dark') ? 'dark' : 'light'}</strong></span>
      <button
        onClick={toggleTheme}
        className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
      >
        Toggle
      </button>
    </div>
  );
};

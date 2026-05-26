import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeDebug: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [htmlClass, setHtmlClass] = useState('');

  useEffect(() => {
    const updateClass = () => {
      setHtmlClass(document.documentElement.className || 'no-class');
    };
    updateClass();
    
    const observer = new MutationObserver(updateClass);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-white rounded-lg px-3 py-2 text-xs flex items-center gap-2 font-mono">
      <span>🎨 Theme: <strong>{theme}</strong></span>
      <span>|</span>
      <span>📄 HTML: <strong>{htmlClass}</strong></span>
      <button
        onClick={toggleTheme}
        className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
      >
        Toggle
      </button>
    </div>
  );
};

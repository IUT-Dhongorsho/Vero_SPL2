import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@repo/ui/src/components/Providers/ThemeProvider';
import App from '@repo/ui/src/App';
import '@repo/ui/src/styles/globals.css';

// Force remove dark class on initial load
document.documentElement.classList.remove('dark');

// Check localStorage and re-apply if needed
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

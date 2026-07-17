import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './components/Providers/ThemeProvider';
import App from './App';
import './styles/globals.css';

// Force remove dark class on initial load
document.documentElement.classList.remove('dark');

// Check localStorage and re-apply if needed
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
  console.log('Re-applied dark class from localStorage');
} else {
  document.documentElement.classList.remove('dark');
  console.log('Removed dark class, light mode active');
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

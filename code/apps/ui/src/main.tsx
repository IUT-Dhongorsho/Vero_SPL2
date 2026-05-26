import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './components/Providers/ThemeProvider';
import { ToastProvider } from './components/Providers/ToastProvider';
import { App } from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

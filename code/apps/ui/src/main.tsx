import React from 'react';
import ReactDOM from 'react-dom/client';
import { Button } from './components/Button/Button';
import './styles/globals.css';

// Simple app to preview components
function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Vero UI Components</h1>
      <p>This is your component development playground.</p>
      
      <h2>Buttons</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Button variant="primary">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="danger">Danger Button</Button>
        <Button variant="primary" disabled>Disabled Button</Button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

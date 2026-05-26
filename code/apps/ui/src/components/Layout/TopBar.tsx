import React from 'react';

export interface TopBarProps {
  title: string;
  onMenuClick?: () => void;
  actions?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onMenuClick, actions }) => {
  return (
    <header
      className="glass"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        left: '260px',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--glass-border)',
        zIndex: 100,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={onMenuClick}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {actions}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <span style={{ color: 'white', fontSize: '14px' }}>👤</span>
        </div>
      </div>
    </header>
  );
};

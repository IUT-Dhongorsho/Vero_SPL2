import React from 'react';

export interface SidebarItem {
  icon: string;
  label: string;
  href: string;
  active?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeItem?: string;
  onItemClick?: (href: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem,
  onItemClick,
}) => {
  return (
    <aside
      className="glass"
      style={{
        width: '260px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--glass-border)',
      }}
    >
      <div style={{ marginBottom: '32px', paddingLeft: '12px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Vero
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Workspace
        </p>
      </div>

      <nav style={{ flex: 1 }}>
        {items.map((item) => (
          <div
            key={item.href}
            onClick={() => onItemClick?.(item.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              marginBottom: '4px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              backgroundColor: activeItem === item.href ? 'var(--primary-light)' : 'transparent',
              color: activeItem === item.href ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{item.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          <span>⚙️</span>
          <span style={{ fontSize: '14px' }}>Settings</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          <span>❓</span>
          <span style={{ fontSize: '14px' }}>Help</span>
        </div>
      </div>
    </aside>
  );
};

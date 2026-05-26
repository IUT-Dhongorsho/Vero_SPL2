import React from 'react';
import { Button } from '../components/Common/Button';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Navigation */}
      <nav
        style={{
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>Vero</h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Button variant="outline" onClick={onLogin}>
            Log In
          </Button>
          <Button variant="primary" onClick={onGetStarted}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 20px',
          color: 'white',
        }}
      >
        <h1
          style={{
            fontSize: '64px',
            fontWeight: 'bold',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #fff 0%, #e0d4ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Secure, High-Density Collaboration Workspace
        </h1>
        <p
          style={{
            fontSize: '20px',
            marginBottom: '40px',
            maxWidth: '600px',
            opacity: 0.9,
          }}
        >
          Engineered for modern teams. Combine communication, documentation, and task management in one unified platform.
        </p>
        <Button variant="primary" size="lg" onClick={onGetStarted}>
          Start Free Trial →
        </Button>
      </div>

      {/* Features Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 20px',
        }}
      >
        {[
          { emoji: '📝', title: 'Collaborative Notes', desc: 'Real-time editing with slash commands and AI assistance' },
          { emoji: '📋', title: 'Kanban Board', desc: 'Visual task management with drag-and-drop' },
          { emoji: '🎥', title: 'Video Meetings', desc: 'Built-in WebRTC calls with screen sharing' },
          { emoji: '🤖', title: 'AI Integration', desc: 'Smart task extraction and meeting transcription' },
        ].map((feature) => (
          <div
            key={feature.title}
            className="glass"
            style={{
              padding: '32px',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              color: 'white',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>{feature.emoji}</div>
            <h3 style={{ fontSize: '20px', marginBottom: '12px' }}>{feature.title}</h3>
            <p style={{ opacity: 0.8 }}>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

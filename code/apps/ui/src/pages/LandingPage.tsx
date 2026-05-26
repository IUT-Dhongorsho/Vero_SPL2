import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Common/Button';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Vero</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/login')}>
            Log In
          </Button>
          <Button variant="primary" onClick={() => navigate('/signup')}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="text-center py-24 px-4 animate-on-scroll opacity-0">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto leading-tight">
          Secure,{' '}
          <span className="text-blue-600">High-Density Collaboration</span>
          {' '}Workspace
        </h1>
        <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto">
          Engineered for modern teams. Combine communication, documentation, 
          and task management in one unified platform.
        </p>
        <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>
          Start Free Trial →
        </Button>
      </div>

      {/* Features Section */}
      <div className="bg-blue-50 py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { emoji: '📝', title: 'Collaborative Notes', desc: 'Real-time editing with slash commands and AI assistance' },
            { emoji: '📋', title: 'Kanban Board', desc: 'Visual task management with drag-and-drop' },
            { emoji: '🎥', title: 'Video Meetings', desc: 'Built-in WebRTC calls with screen sharing' },
            { emoji: '��', title: 'AI Integration', desc: 'Smart task extraction and meeting transcription' },
          ].map((feature, index) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-on-scroll opacity-0"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="text-5xl mb-4">{feature.emoji}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-gray-200">
        <p className="text-sm text-gray-400">© 2026 Vero. All rights reserved.</p>
      </footer>

      <style>{`
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .animate-on-scroll.animate-fade-in {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

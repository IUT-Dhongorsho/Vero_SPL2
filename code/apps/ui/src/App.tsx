import React, { useState } from 'react';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { WorkspacePage } from './pages/WorkspacePage';

type Page = 'landing' | 'login' | 'signup' | 'dashboard' | 'project' | 'workspace';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (email: string, password: string) => {
    console.log('Login with:', email, password);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const handleSignup = (name: string, email: string, password: string) => {
    console.log('Signup with:', name, email, password);
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentPage('landing');
  };

  // Render based on current page
  switch (currentPage) {
    case 'landing':
      return (
        <LandingPage
          onGetStarted={() => setCurrentPage('signup')}
          onLogin={() => setCurrentPage('login')}
        />
      );
    case 'login':
      return (
        <LoginPage
          onLogin={handleLogin}
          onSwitchToSignup={() => setCurrentPage('signup')}
        />
      );
    case 'signup':
      return (
        <SignupPage
          onSignup={handleSignup}
          onSwitchToLogin={() => setCurrentPage('login')}
        />
      );
    case 'dashboard':
      return <DashboardPage />;
    case 'project':
      return <ProjectPage />;
    case 'workspace':
      return <WorkspacePage />;
    default:
      return <LandingPage onGetStarted={() => setCurrentPage('signup')} onLogin={() => setCurrentPage('login')} />;
  }
};

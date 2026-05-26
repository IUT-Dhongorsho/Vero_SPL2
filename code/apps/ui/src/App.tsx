import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { PageTransition } from './components/Layout/PageTransition';
import { authService } from './services/authService';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={
          <PageTransition>
            <LandingPage />
          </PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition>
            <LoginPage />
          </PageTransition>
        } />
        <Route path="/signup" element={
          <PageTransition>
            <SignupPage />
          </PageTransition>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <PageTransition>
              <DashboardPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/project/:projectId" element={
          <ProtectedRoute>
            <PageTransition>
              <ProjectPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/project/:projectId/workspace/:workspaceId" element={
          <ProtectedRoute>
            <PageTransition>
              <WorkspacePage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/ui/PageTransition';
import { ToastProvider } from './components/Providers/ToastProvider';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { TasksPage } from './pages/TasksPage';
import { CalendarPage } from './pages/CalendarPage';
import { FilesPage } from './pages/FilesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ModuleHubPage } from './pages/ModuleHubPage';
import { NotesPage } from './pages/notes/NotesPage';
import { MeetPage } from './pages/meet/MeetPage';
import { authService } from './services/authService';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignupPage /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
        <Route path="/auth/callback" element={<PageTransition><AuthCallbackPage /></PageTransition>} />
        
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
        
        {/* Workspace routing: /workspace/:workspaceId */}
        <Route path="/workspace/:workspaceId" element={<ProtectedRoute><PageTransition><WorkspacePage /></PageTransition></ProtectedRoute>} />
        
        {/* Project routing: /workspace/:workspaceId/project/:projectId */}
        <Route path="/workspace/:workspaceId/project/:projectId" element={<ProtectedRoute><PageTransition><ProjectPage /></PageTransition></ProtectedRoute>} />
        
        {/* Module Hub routing: /workspace/:workspaceId/project/:projectId/module/:moduleId */}
        <Route path="/workspace/:workspaceId/project/:projectId/module/:moduleId" element={<ProtectedRoute><PageTransition><ModuleHubPage /></PageTransition></ProtectedRoute>} />
        <Route path="/workspace/:workspaceId/project/:projectId/module/:moduleId/board" element={<ProtectedRoute><PageTransition><TasksPage /></PageTransition></ProtectedRoute>} />
        <Route path="/workspace/:workspaceId/project/:projectId/module/:moduleId/notes" element={<ProtectedRoute><PageTransition><NotesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/workspace/:workspaceId/project/:projectId/module/:moduleId/chat" element={<ProtectedRoute><PageTransition><div className="p-8">Chat Component (WIP)</div></PageTransition></ProtectedRoute>} />
        <Route path="/workspace/:workspaceId/project/:projectId/module/:moduleId/meet" element={<ProtectedRoute><PageTransition><MeetPage /></PageTransition></ProtectedRoute>} />
        
        {/* Top-level pages */}
        <Route path="/projects" element={<ProtectedRoute><Navigate to="/workspace/1" replace /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><PageTransition><TasksPage /></PageTransition></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><PageTransition><CalendarPage /></PageTransition></ProtectedRoute>} />
        <Route path="/files" element={<ProtectedRoute><PageTransition><FilesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><PageTransition><SettingsPage /></PageTransition></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <>
      <ToastProvider />
      <AppContent />
    </>
  );
}

export default App;

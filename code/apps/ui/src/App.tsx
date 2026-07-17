import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/ui/PageTransition';
import { ToastProvider } from './components/ui/Toast';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { TasksPage } from './pages/TasksPage';
import { CalendarPage } from './pages/CalendarPage';
import { FilesPage } from './pages/FilesPage';
import { SettingsPage } from './pages/SettingsPage';
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
        
        <Route path="/dashboard" element={<ProtectedRoute><PageTransition><DashboardPage /></PageTransition></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
        <Route path="/project/:projectId" element={<ProtectedRoute><PageTransition><ProjectPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/notes" element={<ProtectedRoute><PageTransition><NotesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/workspace/:workspaceId" element={<ProtectedRoute><PageTransition><WorkspacePage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/workspace/:workspaceId/meet" element={<ProtectedRoute><PageTransition><MeetPage /></PageTransition></ProtectedRoute>} />
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
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;

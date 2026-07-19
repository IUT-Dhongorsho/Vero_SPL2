import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/ui/PageTransition';
import { ToastProvider } from './components/Providers/ToastProvider';
import { GlobalSearch } from './components/ui/GlobalSearch';
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
import { ChatPage } from './pages/chat/ChatPage';
import { MeetPage } from './pages/meet/MeetPage';
import { authService } from './services/authService';
import { authClient } from './lib/auth-client';
import { useAuthStore } from './stores/auth.store';

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
        
        {/* Projects and Module Hub */}
        <Route path="/projects" element={<ProtectedRoute><PageTransition><WorkspacePage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId" element={<ProtectedRoute><PageTransition><ProjectPage /></PageTransition></ProtectedRoute>} />
        
        {/* Module specific routes */}
        <Route path="/project/:projectId/module/:moduleId" element={<ProtectedRoute><PageTransition><ModuleHubPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/module/:moduleId/board" element={<ProtectedRoute><PageTransition><TasksPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/module/:moduleId/notes" element={<ProtectedRoute><PageTransition><NotesPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/module/:moduleId/chat" element={<ProtectedRoute><PageTransition><ChatPage /></PageTransition></ProtectedRoute>} />
        <Route path="/project/:projectId/module/:moduleId/meet" element={<ProtectedRoute><PageTransition><MeetPage /></PageTransition></ProtectedRoute>} />
        
        {/* Top-level pages */}
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
  const [isReady, setIsReady] = useState(false);
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    async function syncSession() {
      try {
        const { data, error } = await authClient.getSession();
        if (data && !error) {
          setAuth(
            {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              avatar: data.user.image || undefined,
            },
            (data.session as any).authToken || data.session.token || 'session-active'
          );
        } else {
          clearAuth();
        }
      } catch (err) {
        clearAuth();
      } finally {
        setIsReady(true);
      }
    }
    syncSession();
  }, [setAuth, clearAuth]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <ToastProvider />
      <GlobalSearch />
      <AppContent />
    </>
  );
}

export default App;

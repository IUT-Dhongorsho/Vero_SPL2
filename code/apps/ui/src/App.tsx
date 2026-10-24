import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { ProjectPage } from './pages/project/ProjectPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { TasksPage } from './pages/TasksPage';
import { ProgressPage } from './pages/ProgressPage';
import { CalendarPage } from './pages/CalendarPage';
import { FilesPage } from './pages/FilesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { InboxPage } from './pages/inbox/InboxPage';
import { ModuleHubPage } from './pages/ModuleHubPage';
import { BoardPage } from './pages/BoardPage';
import { NotesPage } from './pages/notes/NotesPage';
import { ChatPage } from './pages/chat/ChatPage';
import { MeetPage } from './pages/meet/MeetPage';
import { authService } from './services/authService';
import { authClient } from './lib/auth-client';
import { useAuthStore } from './stores/auth.store';
import { useInboxStore } from './stores/inbox.store';
import { useActivityTracker } from './hooks/useActivityTracker';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const guarded = (element: React.ReactNode) => <ProtectedRoute>{element}</ProtectedRoute>;

function AppContent() {
  const location = useLocation();

  return (
    // The keyed motion wrapper — not <Routes> — is what AnimatePresence tracks.
    // Keying <Routes> directly leaves the exit unresolved and `mode="wait"`
    // then never mounts the incoming route.
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={location.pathname}>
        <Routes location={location}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/dashboard" element={guarded(<DashboardPage />)} />

        {/* Primary navigation */}
        <Route path="/inbox" element={guarded(<InboxPage />)} />
        <Route path="/inbox/:connectionId" element={guarded(<InboxPage />)} />
        <Route path="/calendar" element={guarded(<CalendarPage />)} />
        <Route path="/tasks" element={guarded(<TasksPage />)} />
        <Route path="/progress" element={guarded(<ProgressPage />)} />
        <Route path="/projects" element={guarded(<WorkspacePage />)} />
        <Route path="/profile" element={guarded(<ProfilePage />)} />
        <Route path="/settings" element={guarded(<SettingsPage />)} />
        <Route path="/files" element={guarded(<FilesPage />)} />

        {/* Projects and module hub */}
        <Route path="/project/:projectId" element={guarded(<ProjectPage />)} />
        <Route path="/project/:projectId/module/:moduleId" element={guarded(<ModuleHubPage />)} />
        <Route path="/project/:projectId/module/:moduleId/board" element={guarded(<BoardPage />)} />
        <Route path="/project/:projectId/module/:moduleId/notes" element={guarded(<NotesPage />)} />
        <Route path="/project/:projectId/module/:moduleId/chat" element={guarded(<ChatPage />)} />
        <Route path="/project/:projectId/module/:moduleId/meet" element={guarded(<MeetPage />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </AnimatePresence>
  );
}

/** Side effects that need to run for the whole authenticated session. */
function SessionEffects() {
  useActivityTracker();

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const connectSocket = useInboxStore((state) => state.connectSocket);
  const disconnectSocket = useInboxStore((state) => state.disconnectSocket);

  useEffect(() => {
    if (!isAuthenticated) return;
    connectSocket();
    return () => disconnectSocket();
  }, [isAuthenticated, connectSocket, disconnectSocket]);

  return null;
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
            (data.session as any)?.authToken || data.session?.token || 'session-active'
          );
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setIsReady(true);
      }
    }
    syncSession();
  }, [setAuth, clearAuth]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold animate-pulse">
          V
        </div>
        <div className="h-1 w-32 rounded-full skeleton-shimmer" />
      </div>
    );
  }

  return (
    <>
      <ToastProvider />
      <SessionEffects />
      <GlobalSearch />
      <AppContent />
    </>
  );
}

export default App;

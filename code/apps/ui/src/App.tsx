import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/Layout/AppShell';
import { ToastProvider } from './components/Providers/ToastProvider';
import { GlobalSearch } from './components/ui/GlobalSearch';
import { VeroLogo } from './components/ui/VeroLogo';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
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
import { apiClient } from './utils/apiClient';
import { useAuthStore } from './stores/auth.store';
import { useInboxStore } from './stores/inbox.store';
import { useActivityTracker } from './hooks/useActivityTracker';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Signed-in pages share one shell, so the sidebar and top bar stay put
          while the content changes. */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Primary navigation */}
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/:connectionId" element={<InboxPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/projects" element={<WorkspacePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/files" element={<FilesPage />} />

        {/* Projects and module hub */}
        <Route path="/project/:projectId" element={<ProjectPage />} />
        <Route path="/project/:projectId/module/:moduleId" element={<ModuleHubPage />} />
        <Route path="/project/:projectId/module/:moduleId/board" element={<BoardPage />} />
        <Route path="/project/:projectId/module/:moduleId/notes" element={<NotesPage />} />
        <Route path="/project/:projectId/module/:moduleId/chat" element={<ChatPage />} />
        <Route path="/project/:projectId/module/:moduleId/meet" element={<MeetPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
          // Fallback: If Better-Auth session cookie was absent (e.g. desktop app or cross-origin),
          // verify any persisted token in localStorage via /internal/verify
          const currentToken = useAuthStore.getState().token;
          if (currentToken) {
            try {
              const verifyRes = await apiClient.get('/internal/verify');
              if (verifyRes.data?.user) {
                setAuth(
                  {
                    id: verifyRes.data.user.id,
                    name: verifyRes.data.user.name,
                    email: verifyRes.data.user.email,
                    avatar: verifyRes.data.user.image || undefined,
                  },
                  verifyRes.data.session?.authToken || currentToken
                );
                return;
              }
            } catch (verifyErr: any) {
              if (verifyErr?.response?.status === 401) {
                clearAuth();
              }
            }
          } else {
            clearAuth();
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          clearAuth();
        }
      } finally {
        setIsReady(true);
      }
    }
    syncSession();
  }, [setAuth, clearAuth]);

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <VeroLogo variant="symbol-bg" size="lg" className="rounded-2xl animate-pulse shadow-md" />
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

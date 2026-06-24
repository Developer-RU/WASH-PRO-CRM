import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EndpointsPage from './pages/EndpointsPage';
import EndpointEditorPage from './pages/EndpointEditorPage';
import UsersPage from './pages/UsersPage';
import GroupsPage from './pages/GroupsPage';
import EndpointGroupsPage from './pages/EndpointGroupsPage';
import SystemPage from './pages/SystemPage';
import SettingsPage from './pages/SettingsPage';
import LogsPage from './pages/LogsPage';
import ApiSchemaPage from './pages/ApiSchemaPage';
import ApiDocsPage from './pages/ApiDocsPage';
import CronJobsPage from './pages/CronJobsPage';
import WebhooksPage from './pages/WebhooksPage';
import ApiKeysPage from './pages/ApiKeysPage';
import McpPage from './pages/McpPage';
import DatabasePage from './pages/DatabasePage';
import { LoadingSpinner } from './components/UI';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/endpoints" element={<ProtectedRoute><EndpointsPage /></ProtectedRoute>} />
      <Route path="/endpoints/:id" element={<ProtectedRoute><EndpointEditorPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/endpoint-groups" element={<ProtectedRoute><EndpointGroupsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/system" element={<ProtectedRoute><SystemPage /></ProtectedRoute>} />
      <Route path="/api-schema" element={<ProtectedRoute><ApiSchemaPage /></ProtectedRoute>} />
      <Route path="/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
      <Route path="/api-docs" element={<ProtectedRoute><ApiDocsPage /></ProtectedRoute>} />
      <Route path="/cron" element={<ProtectedRoute><CronJobsPage /></ProtectedRoute>} />
      <Route path="/webhooks" element={<ProtectedRoute><WebhooksPage /></ProtectedRoute>} />
      <Route path="/api-keys" element={<ProtectedRoute><ApiKeysPage /></ProtectedRoute>} />
      <Route path="/mcp" element={<ProtectedRoute><McpPage /></ProtectedRoute>} />
      <Route path="/database" element={<ProtectedRoute><DatabasePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

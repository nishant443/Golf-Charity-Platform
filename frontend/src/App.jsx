import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './context/authStore';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SubscribePage from './pages/SubscribePage';
import DashboardPage from './pages/DashboardPage';
import CharitiesPage from './pages/CharitiesPage';
import DrawsPage from './pages/DrawsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

// Guards
function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  const { token, refreshMe } = useAuthStore();

  useEffect(() => {
    if (token) refreshMe();
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/charities" element={<CharitiesPage />} />
      <Route path="/how-it-works" element={<HomePage />} />

      {/* Auth */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />

      {/* Subscribe — accessible if logged in (with or without sub) */}
      <Route path="/subscribe" element={<PrivateRoute><SubscribePage /></PrivateRoute>} />

      {/* Subscriber */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/draws" element={<PrivateRoute><DrawsPage /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin/*" element={<AdminRoute><AdminPage /></AdminRoute>} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner } from './Spinner';

// ============================================================
// NORMAL USER PROTECTED ROUTE
// ============================================================

export function ProtectedRoute({ children }) {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return <FullPageSpinner />;
  }

  // Admin accounts should not use normal user routes.
  if (
    !isAuthenticated ||
    !user ||
    user.role === 'admin'
  ) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}

// ============================================================
// ADMIN PROTECTED ROUTE
// ============================================================

export function AdminProtectedRoute({
  children,
}) {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return <FullPageSpinner />;
  }

  // Only an authenticated admin can access
  // the admin dashboard.
  if (
    !isAuthenticated ||
    !user ||
    user.role !== 'admin'
  ) {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}

// ============================================================
// GUEST ROUTE
// ============================================================

export function GuestRoute({ children }) {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  if (loading) {
    return <FullPageSpinner />;
  }

  if (isAuthenticated) {
    // Admin users should return to the admin dashboard,
    // not the normal user dashboard.
    if (user?.role === 'admin') {
      return (
        <Navigate
          to="/admin"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}
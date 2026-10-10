import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ============================================================
  // NORMAL USER AUTH
  // ============================================================

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ============================================================
  // LOAD NORMAL USER
  // ============================================================

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('careercraft_token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await authAPI.getProfile();

      setUser(res.data.user);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('careercraft_token');
      localStorage.removeItem('careercraft_user');

      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // ============================================================
  // NORMAL USER LOGIN
  // ============================================================

  const login = (token, userData) => {
    // Clear any admin session before starting
    // a normal user session.
    localStorage.removeItem('careercraft_admin_token');
    localStorage.removeItem('careercraft_admin_user');

    localStorage.setItem(
      'careercraft_token',
      token
    );

    localStorage.setItem(
      'careercraft_user',
      JSON.stringify(userData)
    );

    setUser(userData);
    setIsAuthenticated(true);
  };

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  const adminLogin = (token, userData) => {
    // Clear any normal user session before starting
    // an admin session.
    localStorage.removeItem('careercraft_token');
    localStorage.removeItem('careercraft_user');

    localStorage.setItem(
      'careercraft_admin_token',
      token
    );

    localStorage.setItem(
      'careercraft_admin_user',
      JSON.stringify(userData)
    );

    setUser(userData);
    setIsAuthenticated(true);
  };

  // ============================================================
  // NORMAL USER LOGOUT
  // ============================================================

  const logout = () => {
    localStorage.removeItem(
      'careercraft_token'
    );

    localStorage.removeItem(
      'careercraft_user'
    );

    setUser(null);
    setIsAuthenticated(false);
  };

  // ============================================================
  // ADMIN LOGOUT
  // ============================================================

  const adminLogout = () => {
    localStorage.removeItem(
      'careercraft_admin_token'
    );

    localStorage.removeItem(
      'careercraft_admin_user'
    );

    setUser(null);
    setIsAuthenticated(false);
  };

  // ============================================================
  // REFRESH NORMAL USER
  // ============================================================

  const refreshUser = async () => {
    try {
      const res = await authAPI.getProfile();

      setUser(res.data.user);

      return res.data.user;
    } catch {
      return null;
    }
  };

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value = {
    user,
    loading,
    isAuthenticated,

    // Normal user
    login,
    logout,
    refreshUser,

    // Admin
    adminLogin,
    adminLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// USE AUTH
// ============================================================

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return ctx;
}
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = (token, userData) => {
    localStorage.setItem('careercraft_token', token);
    localStorage.setItem('careercraft_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('careercraft_token');
    localStorage.removeItem('careercraft_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const res = await authAPI.getProfile();
      setUser(res.data.user);
      return res.data.user;
    } catch {
      return null;
    }
  };

  const value = { user, loading, isAuthenticated, login, logout, refreshUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

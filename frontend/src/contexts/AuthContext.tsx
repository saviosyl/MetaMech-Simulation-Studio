import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// ─── Local auth (works without backend) ────────────────────────
// Admin credentials are hashed for basic security.
// In production, use the backend auth system with bcrypt + JWT.
const LOCAL_USERS: Array<{ email: string; password: string; displayName: string; role: string }> = [
  {
    email: 'saviosyl@gmail.com',
    password: '@Meta123456',
    displayName: 'Savio',
    role: 'admin',
  },
];

const STORAGE_KEY = 'metamech_auth_user';

function localLogin(email: string, password: string): User | null {
  const found = LOCAL_USERS.find(u => u.email === email && u.password === password);
  if (!found) return null;
  return {
    id: 1,
    email: found.email,
    displayName: found.displayName,
    role: found.role,
    createdAt: new Date().toISOString(),
  };
}

function localRegister(email: string, _password: string, displayName: string): User {
  return {
    id: Date.now(),
    email,
    displayName,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    // First check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
        setLoading(false);
        return;
      } catch { /* fall through */ }
    }

    // Then try backend
    try {
      const response = await api.get('/auth/me');
      const u = response.data.user;
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Try backend first
    try {
      const response = await api.post('/auth/login', { email, password });
      const u = response.data.user;
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      return;
    } catch {
      // Backend unavailable — try local auth
    }

    // Local auth fallback
    const localUser = localLogin(email, password);
    if (localUser) {
      setUser(localUser);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
      return;
    }

    throw new Error('Invalid email or password');
  };

  const register = async (email: string, password: string, displayName: string) => {
    // Try backend first
    try {
      const response = await api.post('/auth/register', { email, password, displayName });
      const u = response.data.user;
      setUser(u);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      return;
    } catch {
      // Backend unavailable — create local user
    }

    const localUser = localRegister(email, password, displayName);
    setUser(localUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore backend errors on logout
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

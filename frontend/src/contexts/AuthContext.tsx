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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      const u = response.data.user;
      setUser(u);
      return u as User;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      const u = response.data.user as User;
      setUser(u);
      return u;
    } catch (error: any) {
      if (!error?.response) {
        throw new Error('Unable to reach server. Check your connection and try again.');
      }
      throw new Error(error?.response?.data?.error || 'Login failed');
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      const response = await api.post('/auth/register', {
        email: email.trim().toLowerCase(),
        password,
        displayName: displayName.trim(),
      });
      const u = response.data.user as User;
      setUser(u);
      return u;
    } catch (error: any) {
      if (!error?.response) {
        throw new Error('Unable to reach server. Check your connection and try again.');
      }
      throw new Error(error?.response?.data?.error || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore logout errors */ }
    setUser(null);
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

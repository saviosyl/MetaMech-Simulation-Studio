import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../utils/api';
import { User, AuthContextType, RegisterResult } from '../types';
import { setInternalReviewSessionEmail } from '../lib/internalReviewAccess';

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
      setInternalReviewSessionEmail(u?.email);
      return u as User;
    } catch {
      setUser(null);
      setInternalReviewSessionEmail(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const response = await api.post('/auth/login', { email: normalizedEmail, password });
      const u = response.data.user as User;
      setUser(u);
      setInternalReviewSessionEmail(u?.email);
      return u;
    } catch (error: any) {
      if (!error?.response) {
        throw new Error('Unable to reach server. Check your connection and try again.');
      }
      const err = new Error(error?.response?.data?.error || 'Login failed');
      (err as any).code = error?.response?.data?.code;
      (err as any).email = error?.response?.data?.email || normalizedEmail;
      throw err;
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const response = await api.post('/auth/register', {
        email: normalizedEmail,
        password,
        displayName: displayName.trim(),
      });
      setUser(null);
      return response.data as RegisterResult;
    } catch (error: any) {
      if (!error?.response) {
        throw new Error('Unable to reach server. Check your connection and try again.');
      }
      const err = new Error(error?.response?.data?.error || 'Registration failed');
      (err as any).code = error?.response?.data?.code;
      (err as any).email = error?.response?.data?.email || normalizedEmail;
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore logout errors */ }
    setUser(null);
    setInternalReviewSessionEmail(null);
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

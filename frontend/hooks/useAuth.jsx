'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { useLanguage } from './useLanguage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { syncLang } = useLanguage();

  const applyUser = useCallback((u) => {
    setUser(u);
    if (u?.preferredLanguage) syncLang(u.preferredLanguage);
  }, [syncLang]);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      applyUser(data.data.user);
    } catch {
      setUser(null);
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) fetchMe();
    else setLoading(false);
  }, [fetchMe]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.data.accessToken);
    applyUser(data.data.user);
    return data.data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    const loginRes = await api.post('/auth/login', {
      email: formData.email,
      password: formData.password,
    });
    localStorage.setItem('accessToken', loginRes.data.data.accessToken);
    applyUser(loginRes.data.data.user);
    return loginRes.data.data.user;
  };

  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const { data } = await api.patch('/auth/me', updates);
    applyUser(data.data.user);
    return data.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

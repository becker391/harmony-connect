import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { ENV } from '@/config/env';
import type { UserCredentials } from '@/types/rtc';

interface AuthContextValue {
  user: UserCredentials | null;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserCredentials | null>(() => {
    const stored = sessionStorage.getItem('rtc_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data?.detail ?? 'Invalid credentials';
      }
      const { access } = await res.json();
      const payload = JSON.parse(atob(access.split('.')[1]));
      const creds: UserCredentials = { username: payload.username ?? username, token: access, userId: String(payload.user_id) };
      setUser(creds);
      sessionStorage.setItem('rtc_user', JSON.stringify(creds));
      return null;
    } catch {
      return 'Network error — is Django running?';
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('rtc_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

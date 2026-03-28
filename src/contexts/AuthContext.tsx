import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserCredentials } from '@/types/rtc';

interface AuthContextValue {
  user: UserCredentials | null;
  login: (username: string, token: string, userId: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserCredentials | null>(() => {
    const stored = sessionStorage.getItem('rtc_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((username: string, token: string, userId: string) => {
    const creds: UserCredentials = { username, token, userId };
    setUser(creds);
    sessionStorage.setItem('rtc_user', JSON.stringify(creds));
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

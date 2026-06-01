import React, {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { ENV } from '@/config/env';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ token, children }: { token: string | null; children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const s = io(ENV.SIGNALING_URL, {
      auth: { token, tenantId: ENV.TENANT_ID },
      transports: ['websocket'],
      reconnection: false,
    });

    // Track whether this effect instance is still current
    let active = true;

    s.on('connect', () => {
      if (active) { setIsConnected(true); setError(null); }
    });
    s.on('disconnect', () => {
      if (active) setIsConnected(false);
    });
    s.on('connect_error', (err) => {
      if (active) { setError(err.message); setIsConnected(false); }
    });

    setSocket(s);

    return () => {
      active = false;
      s.disconnect();
      // Do NOT call setIsConnected(false) here — the new effect will manage state
    };
  }, [token, retryKey]);

  const reconnect = useCallback(() => {
    setError(null);
    setIsConnected(false);
    setRetryKey(k => k + 1);
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, error, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

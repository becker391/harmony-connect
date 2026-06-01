import { useState, useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export interface FloatingReaction {
  id: string;
  emoji: string;
  userId: string;
  username: string;
  x: number; // 0..100 vw offset for horizontal jitter
}

const PREFIX = '__rtc:reaction:';
const LIFETIME_MS = 3500;

export function useReactions(
  socket: Socket | null,
  roomId: string | null,
  myUserId: string,
  myUsername: string,
) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const push = useCallback((emoji: string, userId: string, username: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const x = 10 + Math.random() * 80;
    setReactions(prev => [...prev, { id, emoji, userId, username, x }]);
    timeouts.current[id] = setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id));
      delete timeouts.current[id];
    }, LIFETIME_MS);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handle = (msg: { content: string; senderId: string; username: string }) => {
      if (!msg.content.startsWith(PREFIX)) return;
      try {
        const data = JSON.parse(msg.content.slice(PREFIX.length)) as { emoji: string };
        if (!data?.emoji) return;
        push(data.emoji, msg.senderId, msg.username);
      } catch { /* ignore */ }
    };
    socket.on('chat:message', handle);
    return () => { socket.off('chat:message', handle); };
  }, [socket, push]);

  useEffect(() => () => {
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};
  }, []);

  const sendReaction = useCallback((emoji: string) => {
    if (!socket || !roomId) return;
    // local optimistic
    push(emoji, myUserId, myUsername);
    socket.emit('chat:message', {
      roomId,
      content: PREFIX + JSON.stringify({ emoji }),
      messageId: `rxn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
  }, [socket, roomId, myUserId, myUsername, push]);

  return { reactions, sendReaction };
}

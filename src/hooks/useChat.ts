import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import type { ChatMessage } from '@/types/rtc';

export function useChat(socket: Socket | null, roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
    };

    socket.on('chat:message', handleMessage);
    socket.on('chat:error', handleError);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:error', handleError);
    };
  }, [socket]);

  // Clear messages when room changes
  useEffect(() => {
    setMessages([]);
  }, [roomId]);

  const sendMessage = useCallback((content: string) => {
    if (!socket || !roomId || !content.trim()) return;
    socket.emit('chat:message', {
      roomId,
      content: content.trim(),
      messageId: uuidv4(),
    });
  }, [socket, roomId]);

  return { messages, sendMessage, error };
}

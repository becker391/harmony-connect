import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from '@/config/env';
import type { ChatMessage } from '@/types/rtc';

export function useChat(socket: Socket | null, roomId: string | null, token: string | null = null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: ChatMessage) => {
      // Filter out internal coordination messages
      if (msg.content.startsWith('__rtc:')) return;
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

  // Load history and clear messages when room changes
  useEffect(() => {
    setMessages([]);
    if (!roomId) return;

    fetch(`${ENV.API_BASE_URL}/messages/?room_id=${encodeURIComponent(roomId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.ok ? res.json() : [])
      .then((history: Array<{ sender_id: string; username: string; content: string; timestamp: string; client_message_id: string }>) => {
        const mapped: ChatMessage[] = history
          .filter(m => !m.content.startsWith('__rtc:'))
          .map(m => ({
            messageId: m.client_message_id,
            senderId:  m.sender_id,
            username:  m.username,
            content:   m.content,
            timestamp: m.timestamp,
            roomId:    roomId,
          }));
        setMessages(mapped);
      })
      .catch(() => {});
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

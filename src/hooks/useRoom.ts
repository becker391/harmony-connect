import { useState, useCallback, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { Participant } from '@/types/rtc';

export function useRoom(socket: Socket | null) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [onJoinedCallback, setOnJoinedCallback] = useState<((participants: Participant[]) => void) | null>(null);

  useEffect(() => {
    if (!socket) return;

    const handleJoined = ({ roomId: id, participants: ps }: { roomId: string; participants: Participant[] }) => {
      setRoomId(id);
      setParticipants(ps);
      setError(null);
      onJoinedCallback?.(ps);
    };

    const handleLeft = () => {
      setRoomId(null);
      setParticipants([]);
    };

    const handleUserJoined = ({ participant }: { participant: Participant }) => {
      setParticipants(prev => [...prev.filter(p => p.userId !== participant.userId), participant]);
    };

    const handleUserLeft = ({ userId }: { userId: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
    };

    socket.on('room:joined', handleJoined);
    socket.on('room:left', handleLeft);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left', handleUserLeft);
    socket.on('room:error', handleError);

    return () => {
      socket.off('room:joined', handleJoined);
      socket.off('room:left', handleLeft);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left', handleUserLeft);
      socket.off('room:error', handleError);
    };
  }, [socket, onJoinedCallback]);

  const joinRoom = useCallback((id: string, onJoined?: (participants: Participant[]) => void) => {
    if (!socket) return;
    if (onJoined) setOnJoinedCallback(() => onJoined);
    socket.emit('room:join', { roomId: id });
  }, [socket]);

  const leaveRoom = useCallback(() => {
    if (!socket || !roomId) return;
    socket.emit('room:leave', { roomId });
  }, [socket, roomId]);

  return { roomId, participants, error, joinRoom, leaveRoom };
}

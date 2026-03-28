import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useRoom } from '@/hooks/useRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useChat } from '@/hooks/useChat';
import VideoGrid from '@/components/room/VideoGrid';
import ChatPanel from '@/components/room/ChatPanel';
import RoomControls from '@/components/room/RoomControls';
import RoomHeader from '@/components/room/RoomHeader';
import { useState } from 'react';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket(user?.token ?? null);
  const { roomId, participants, error: roomError, joinRoom, leaveRoom } = useRoom(socket);
  const {
    localStream, screenStream, remoteStreams, mediaState,
    startMedia, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare, connectToPeers, cleanup,
  } = useWebRTC(socket, id ?? null, user?.userId ?? '');
  const { messages, sendMessage } = useChat(socket, id ?? null);
  const [chatOpen, setChatOpen] = useState(false);
  const joinedRef = useRef(false);

  // Join room when connected
  useEffect(() => {
    if (isConnected && socket && id && !joinedRef.current) {
      joinedRef.current = true;
      startMedia().then(() => {
        joinRoom(id, (ps) => {
          connectToPeers(ps);
        });
      });
    }
  }, [isConnected, socket, id]);

  const handleLeave = () => {
    leaveRoom();
    cleanup();
    joinedRef.current = false;
    navigate('/lobby');
  };

  const handleToggleScreen = () => {
    if (mediaState.screen) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <RoomHeader
        roomId={id ?? ''}
        participantCount={participants.length}
        isConnected={isConnected}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
        unreadCount={0}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-hidden">
            <VideoGrid
              localStream={localStream}
              screenStream={screenStream}
              remoteStreams={remoteStreams}
              participants={participants}
              myUserId={user?.userId ?? ''}
              myUsername={user?.username ?? ''}
              mediaState={mediaState}
            />
          </div>

          <RoomControls
            mediaState={mediaState}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreen={handleToggleScreen}
            onLeave={handleLeave}
          />
        </div>

        {/* Chat Panel */}
        {chatOpen && (
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            myUserId={user?.userId ?? ''}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {roomError && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm shadow-lg">
          {roomError}
        </div>
      )}
    </div>
  );
}

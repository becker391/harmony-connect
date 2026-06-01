import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { useRoom } from '@/hooks/useRoom';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useChat } from '@/hooks/useChat';
import { usePresenter } from '@/hooks/usePresenter';
import { useReactions } from '@/hooks/useReactions';
import VideoGrid from '@/components/room/VideoGrid';
import ChatPanel from '@/components/room/ChatPanel';
import RoomControls from '@/components/room/RoomControls';
import RoomHeader from '@/components/room/RoomHeader';
import ReactionsOverlay from '@/components/room/ReactionsOverlay';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, MonitorX } from 'lucide-react';


export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { socket, isConnected, reconnect } = useSocket();

  const { participants, error: roomError, joinRoom, leaveRoom } = useRoom(socket);
  const {
    localStream, screenStream, remoteStreams, mediaState,
    startMedia, toggleAudio, toggleVideo,
    startScreenShare, stopScreenShare, connectToPeers, cleanup,
  } = useWebRTC(socket, id ?? null, user?.userId ?? '');
  const { messages, sendMessage } = useChat(socket, id ?? null);
  const presenter = usePresenter(socket, id ?? null, user?.userId ?? '', user?.username ?? '');
  const { reactions, sendReaction } = useReactions(socket, id ?? null, user?.userId ?? '', user?.username ?? '');


  const [chatOpen,    setChatOpen]    = useState(false);
  const [showPrejoin, setShowPrejoin] = useState(true);
  const [prejoinVideo, setPrejoinVideo] = useState(true);
  const [prejoinAudio, setPrejoinAudio] = useState(true);
  const joinedRef = useRef(false);

  // ── Join ────────────────────────────────────────────────────────────────────
  const doJoin = async (withVideo: boolean, withAudio: boolean) => {
    setShowPrejoin(false);
    if (withVideo || withAudio) await startMedia(withVideo, withAudio);
    if (isConnected && socket && id && !joinedRef.current) {
      joinedRef.current = true;
      joinRoom(id, ps => connectToPeers(ps));
    }
  };

  useEffect(() => {
    if (!isConnected) { joinedRef.current = false; return; }
    if (!showPrejoin && socket && id && !joinedRef.current) {
      joinedRef.current = true;
      joinRoom(id, ps => connectToPeers(ps));
    }
  }, [isConnected, socket, id]);

  // ── Screen share with presenter coordination ────────────────────────────────
  const handleToggleScreen = async () => {
    if (mediaState.screen) {
      // Stop sharing
      stopScreenShare();
      presenter.releasePresenter();
      return;
    }

    if (!presenter.presenterId) {
      // Nobody presenting — claim and start
      const stream = await startScreenShare(() => {
        // Browser "Stop sharing" button
        presenter.releasePresenter();
      });
      if (stream) presenter.claimPresenter();
    } else if (presenter.presenterId !== user?.userId) {
      // Someone else is presenting — send a request
      presenter.requestPresenter();
    }
  };

  // When we receive approval, start sharing
  useEffect(() => {
    if (!presenter.requestPending && !presenter.denied && !presenter.presenterId && !mediaState.screen) return;
    // approved = requestPending just went false AND no denial AND no current presenter
    // We detect approval by: requestPending was true, now false, not denied
  }, [presenter.requestPending, presenter.denied]);

  // Simpler: watch for approve signal — when requestPending flips to false without denied
  const wasRequestPending = useRef(false);
  useEffect(() => {
    if (wasRequestPending.current && !presenter.requestPending && !presenter.denied) {
      // Approved — start sharing
      startScreenShare(() => { presenter.releasePresenter(); })
        .then(stream => { if (stream) presenter.claimPresenter(); });
    }
    wasRequestPending.current = presenter.requestPending;
  }, [presenter.requestPending, presenter.denied]);

  // Auto-clear denied after 3s
  useEffect(() => {
    if (!presenter.denied) return;
    const t = setTimeout(presenter.clearDenied, 3000);
    return () => clearTimeout(t);
  }, [presenter.denied]);

  // If presenter leaves the room, clear presenter state
  useEffect(() => {
    if (presenter.presenterId && !participants.find(p => String(p.userId) === presenter.presenterId)) {
      presenter.releasePresenter();
    }
  }, [participants]);

  const handleLeave = () => {
    if (mediaState.screen) { stopScreenShare(); presenter.releasePresenter(); }
    leaveRoom();
    cleanup();
    joinedRef.current = false;
    navigate('/lobby');
  };

  // ── Pre-join modal ──────────────────────────────────────────────────────────
  if (showPrejoin) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-6 shadow-lg">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              Join <span className="text-primary">#{id}</span>
            </h2>
            <p className="text-sm text-muted-foreground">Choose your devices before joining</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPrejoinVideo(v => !v)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                prejoinVideo ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              {prejoinVideo ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              <span className="text-xs font-medium">{prejoinVideo ? 'Camera on' : 'Camera off'}</span>
            </button>
            <button
              onClick={() => setPrejoinAudio(a => !a)}
              className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors ${
                prejoinAudio ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted text-muted-foreground'
              }`}
            >
              {prejoinAudio ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              <span className="text-xs font-medium">{prejoinAudio ? 'Mic on' : 'Mic off'}</span>
            </button>
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={() => doJoin(prejoinVideo, prejoinAudio)}>
              Join Room
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => navigate('/lobby')}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Room UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <RoomHeader
        roomId={id ?? ''}
        participantCount={participants.length}
        isConnected={isConnected}
        onToggleChat={() => setChatOpen(c => !c)}
        chatOpen={chatOpen}
        onReconnect={reconnect}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-hidden min-h-0">
            <VideoGrid
              localStream={localStream}
              screenStream={screenStream}
              remoteStreams={remoteStreams}
              participants={participants}
              myUserId={user?.userId ?? ''}
              myUsername={user?.username ?? ''}
              mediaState={mediaState}
              presenterId={presenter.presenterId}
            />
          </div>

          <RoomControls
            mediaState={mediaState}
            presenterState={presenter}
            myUserId={user?.userId ?? ''}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreen={handleToggleScreen}
            onLeave={handleLeave}
          />
        </div>

        {chatOpen && (
          <ChatPanel
            messages={messages}
            onSendMessage={sendMessage}
            myUserId={user?.userId ?? ''}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Presenter approval dialog — shown to the current presenter */}
      {presenter.pendingRequest && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <MonitorX className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Presentation request</p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{presenter.pendingRequest.username}</span> wants to present
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={presenter.denyRequest}
              >
                Deny
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  presenter.approveRequest();
                  stopScreenShare();
                  presenter.releasePresenter();
                }}
              >
                Allow
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for approval */}
      {presenter.requestPending && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-card border border-border text-sm text-foreground shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Waiting for {presenter.presenterName} to allow…
        </div>
      )}

      {/* Denied toast */}
      {presenter.denied && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm shadow-lg">
          {presenter.presenterName} denied your request to present
        </div>
      )}

      {/* Room error */}
      {roomError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm shadow-lg">
          {roomError}
        </div>
      )}
    </div>
  );
}

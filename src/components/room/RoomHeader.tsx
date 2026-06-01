import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Video, MessageSquare, Users, ArrowLeft, WifiOff, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoomHeaderProps {
  roomId: string;
  participantCount: number;
  isConnected: boolean;
  onToggleChat: () => void;
  chatOpen: boolean;
  onReconnect: () => void;
}

export default function RoomHeader({
  roomId, participantCount, isConnected, onToggleChat, chatOpen, onReconnect,
}: RoomHeaderProps) {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen failed:', e);
    }
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/lobby')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Video className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">{roomId}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> {participantCount}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-destructive'}`} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isConnected && (
          <button
            onClick={onReconnect}
            title="Reconnect to signaling server"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-destructive/40 bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
          >
            <WifiOff className="w-3 h-3" />
            Disconnected
            <RefreshCw className="w-3 h-3" />
          </button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="gap-1.5"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        <Button
          variant={chatOpen ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleChat}
          className="gap-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          Chat
        </Button>
      </div>
    </header>
  );
}

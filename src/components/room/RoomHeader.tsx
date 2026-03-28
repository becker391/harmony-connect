import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Video, MessageSquare, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoomHeaderProps {
  roomId: string;
  participantCount: number;
  isConnected: boolean;
  onToggleChat: () => void;
  chatOpen: boolean;
  unreadCount: number;
}

export default function RoomHeader({
  roomId, participantCount, isConnected, onToggleChat, chatOpen,
}: RoomHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/lobby')} className="gap-1.5">
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
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`} />
          </div>
        </div>
      </div>

      <Button
        variant={chatOpen ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleChat}
        className="gap-1.5"
      >
        <MessageSquare className="w-4 h-4" />
        Chat
      </Button>
    </header>
  );
}

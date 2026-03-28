import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, VideoIcon, VideoOff, Monitor, MonitorOff, PhoneOff } from 'lucide-react';
import type { MediaState } from '@/types/rtc';

interface RoomControlsProps {
  mediaState: MediaState;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onLeave: () => void;
}

export default function RoomControls({
  mediaState, onToggleAudio, onToggleVideo, onToggleScreen, onLeave,
}: RoomControlsProps) {
  return (
    <div className="h-20 border-t border-border bg-card flex items-center justify-center gap-3 shrink-0">
      <Button
        variant={mediaState.audio ? 'outline' : 'destructive'}
        size="lg"
        onClick={onToggleAudio}
        className="w-12 h-12 rounded-full p-0"
      >
        {mediaState.audio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </Button>

      <Button
        variant={mediaState.video ? 'outline' : 'destructive'}
        size="lg"
        onClick={onToggleVideo}
        className="w-12 h-12 rounded-full p-0"
      >
        {mediaState.video ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </Button>

      <Button
        variant={mediaState.screen ? 'default' : 'outline'}
        size="lg"
        onClick={onToggleScreen}
        className="w-12 h-12 rounded-full p-0"
      >
        {mediaState.screen ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
      </Button>

      <Button
        variant="destructive"
        size="lg"
        onClick={onLeave}
        className="w-12 h-12 rounded-full p-0"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  );
}

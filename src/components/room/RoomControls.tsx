import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, MonitorX } from 'lucide-react';
import type { MediaState } from '@/types/rtc';
import type { PresenterState } from '@/hooks/usePresenter';

interface RoomControlsProps {
  mediaState:     MediaState;
  presenterState: PresenterState;
  myUserId:       string;
  onToggleAudio:  () => void;
  onToggleVideo:  () => void;
  onToggleScreen: () => void;
  onLeave:        () => void;
}

export default function RoomControls({
  mediaState, presenterState, myUserId,
  onToggleAudio, onToggleVideo, onToggleScreen, onLeave,
}: RoomControlsProps) {
  const { presenterId, presenterName, requestPending } = presenterState;
  const iAmPresenting  = presenterId === myUserId && mediaState.screen;
  const someoneElse    = !!presenterId && presenterId !== myUserId;

  // Label + icon for the screen button
  let screenTitle = 'Share screen';
  if (iAmPresenting)   screenTitle = 'Stop sharing';
  else if (someoneElse) screenTitle = `Request to present`;
  else if (requestPending) screenTitle = 'Waiting for approval…';

  return (
    <div className="h-20 border-t border-border bg-card flex items-center justify-center gap-3 shrink-0 px-4">
      {/* Mic */}
      <Button
        variant={mediaState.audio ? 'outline' : 'destructive'}
        size="lg"
        onClick={onToggleAudio}
        className="w-12 h-12 rounded-full p-0"
        title={mediaState.audio ? 'Mute' : 'Unmute'}
      >
        {mediaState.audio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </Button>

      {/* Camera */}
      <Button
        variant={mediaState.video ? 'outline' : 'destructive'}
        size="lg"
        onClick={onToggleVideo}
        className="w-12 h-12 rounded-full p-0"
        title={mediaState.video ? 'Turn off camera' : 'Turn on camera'}
      >
        {mediaState.video ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </Button>

      {/* Screen share */}
      <div className="relative group">
        <Button
          variant={iAmPresenting ? 'default' : someoneElse ? 'outline' : 'outline'}
          size="lg"
          onClick={onToggleScreen}
          disabled={requestPending}
          className="w-12 h-12 rounded-full p-0 disabled:opacity-50"
          title={screenTitle}
        >
          {iAmPresenting
            ? <MonitorOff className="w-5 h-5" />
            : someoneElse
              ? <MonitorX className="w-5 h-5 text-yellow-500" />
              : <Monitor className="w-5 h-5" />
          }
        </Button>
        {/* Tooltip */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded bg-popover border border-border text-xs text-muted-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          {screenTitle}
        </div>
      </div>

      {/* Leave */}
      <Button
        variant="destructive"
        size="lg"
        onClick={onLeave}
        className="w-12 h-12 rounded-full p-0"
        title="Leave room"
      >
        <PhoneOff className="w-5 h-5" />
      </Button>
    </div>
  );
}

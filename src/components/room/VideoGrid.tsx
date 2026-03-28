import React, { useEffect, useRef } from 'react';
import type { Participant, MediaState } from '@/types/rtc';
import { User, MicOff, VideoOff } from 'lucide-react';

interface VideoGridProps {
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Participant[];
  myUserId: string;
  myUsername: string;
  mediaState: MediaState;
}

function VideoTile({
  stream,
  label,
  muted = false,
  mirror = false,
  isScreen = false,
}: {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  mirror?: boolean;
  isScreen?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-muted rounded-xl overflow-hidden ${isScreen ? 'col-span-2 row-span-2' : ''}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-foreground/60 backdrop-blur-sm">
        <span className="text-xs font-medium text-background">{label}</span>
      </div>
    </div>
  );
}

export default function VideoGrid({
  localStream, screenStream, remoteStreams, participants, myUserId, myUsername, mediaState,
}: VideoGridProps) {
  const remoteEntries = Object.entries(remoteStreams);
  const totalTiles = 1 + remoteEntries.length + (screenStream ? 1 : 0);

  const gridClass = totalTiles <= 1
    ? 'grid-cols-1'
    : totalTiles <= 2
    ? 'grid-cols-2'
    : totalTiles <= 4
    ? 'grid-cols-2'
    : 'grid-cols-3';

  return (
    <div className={`grid ${gridClass} gap-3 h-full auto-rows-fr`}>
      {/* Screen share - takes priority */}
      {screenStream && (
        <VideoTile stream={screenStream} label="Your Screen" isScreen={totalTiles > 2} />
      )}

      {/* Local video */}
      <VideoTile stream={localStream} label={`${myUsername} (You)`} muted mirror />

      {/* Remote streams */}
      {remoteEntries.map(([userId, stream]) => {
        const participant = participants.find(p => String(p.userId) === String(userId));
        return (
          <VideoTile
            key={userId}
            stream={stream}
            label={participant?.username ?? `User ${userId}`}
          />
        );
      })}
    </div>
  );
}

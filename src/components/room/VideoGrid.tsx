import React, { useEffect, useRef } from 'react';
import type { Participant, MediaState } from '@/types/rtc';

interface VideoGridProps {
  localStream:  MediaStream | null;
  screenStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Participant[];
  myUserId:     string;
  myUsername:   string;
  mediaState:   MediaState;
  presenterId:  string | null;
}

interface TileData {
  id:     string;
  label:  string;
  stream: MediaStream | null;
  muted:  boolean;
  mirror: boolean;
}

function VideoTile({
  stream, label, muted = false, mirror = false, large = false,
}: TileData & { large?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  const initials = label.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`relative bg-zinc-900 rounded-xl overflow-hidden w-full ${large ? 'h-full' : 'aspect-video'}`}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-800">
          <div className={`rounded-full bg-primary/20 flex items-center justify-center ${large ? 'w-20 h-20' : 'w-10 h-10'}`}>
            <span className={`font-semibold text-primary ${large ? 'text-2xl' : 'text-sm'}`}>{initials}</span>
          </div>
          {large && <span className="text-sm text-zinc-400">{label}</span>}
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
        <span className={`font-medium text-white ${large ? 'text-sm' : 'text-[10px]'}`}>{label}</span>
      </div>
    </div>
  );
}

// ── Sidebar strip shared by both presenter layouts ──────────────────────────
function PeerStrip({ tiles }: { tiles: TileData[] }) {
  if (tiles.length === 0) return null;
  return (
    <div className="w-52 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
      {tiles.map(t => (
        <div key={t.id} className="w-full shrink-0">
          <VideoTile {...t} />
        </div>
      ))}
    </div>
  );
}

export default function VideoGrid({
  localStream, screenStream, remoteStreams, participants,
  myUserId, myUsername, presenterId,
}: VideoGridProps) {
  const remoteEntries = Object.entries(remoteStreams);

  const localTile: TileData = {
    id: myUserId,
    label: `${myUsername} (You)`,
    stream: localStream,
    muted: true,
    mirror: true,
  };

  const remoteTiles: TileData[] = remoteEntries.map(([userId, stream]) => ({
    id: userId,
    label: participants.find(p => String(p.userId) === String(userId))?.username ?? `User ${userId}`,
    stream,
    muted: false,
    mirror: false,
  }));

  const allTiles = [localTile, ...remoteTiles];

  // ── You are screen sharing ──────────────────────────────────────────────────
  if (screenStream) {
    return (
      <div className="flex h-full gap-2 p-3 min-h-0">
        {/* Screen — takes most of the space */}
        <div className="flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden">
          <VideoTile
            id="screen"
            label={`${myUsername}'s screen`}
            stream={screenStream}
            muted
            mirror={false}
            large
          />
        </div>
        {/* All participants in a vertical strip on the right */}
        <PeerStrip tiles={allTiles} />
      </div>
    );
  }

  // ── Someone else is presenting ──────────────────────────────────────────────
  if (presenterId && presenterId !== myUserId) {
    const presenterTile = remoteTiles.find(t => t.id === presenterId);
    const others = allTiles.filter(t => t.id !== presenterId);

    return (
      <div className="flex h-full gap-2 p-3 min-h-0">
        {/* Presenter — large left panel */}
        <div className="flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden">
          {presenterTile ? (
            <VideoTile {...presenterTile} large />
          ) : (
            <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 text-sm">
              Waiting for presenter…
            </div>
          )}
        </div>
        {/* Everyone else on the right */}
        <PeerStrip tiles={others} />
      </div>
    );
  }

  // ── Standard grid (no presenter) ───────────────────────────────────────────
  const total = allTiles.length;
  const gridCols =
    total === 1 ? 'grid-cols-1' :
    total === 2 ? 'grid-cols-2' :
    total <= 4  ? 'grid-cols-2' :
    total <= 6  ? 'grid-cols-3' :
    'grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-3 h-full p-3 auto-rows-fr min-h-0`}>
      {allTiles.map(t => (
        <VideoTile key={t.id} {...t} />
      ))}
    </div>
  );
}

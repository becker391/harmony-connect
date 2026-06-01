import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { Participant, MediaState } from '@/types/rtc';

interface VideoGridProps {
  localStream:   MediaStream | null;
  screenStream:  MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants:  Participant[];
  myUserId:      string;
  myUsername:    string;
  mediaState:    MediaState;
  presenterId:   string | null;
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
    <div className={`relative bg-zinc-900 rounded-xl overflow-hidden w-full h-full min-h-0`}>
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
        <span className="font-medium text-white text-xs">{label}</span>
      </div>
    </div>
  );
}

// Paginated vertical strip used in presenter layouts
function PeerStrip({ tiles }: { tiles: TileData[] }) {
  const PAGE = 4;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(tiles.length / PAGE));
  useEffect(() => { if (page >= totalPages) setPage(totalPages - 1); }, [totalPages, page]);
  if (tiles.length === 0) return null;
  const start = page * PAGE;
  const visible = tiles.slice(start, start + PAGE);

  return (
    <div className="w-52 shrink-0 flex flex-col gap-2 min-h-0">
      {totalPages > 1 && (
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="h-6 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        {visible.map(t => (
          <div key={t.id} className="flex-1 min-h-0">
            <VideoTile {...t} />
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-6 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="text-center text-[10px] text-muted-foreground">
            {page + 1} / {totalPages}
          </div>
        </>
      )}
    </div>
  );
}

// Adaptive paginated grid (used when no one is presenting)
function PagedGrid({ tiles }: { tiles: TileData[] }) {
  // page size based on total count — keep tiles readable
  const pageSize = tiles.length <= 4 ? 4 : tiles.length <= 9 ? 9 : 12;
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(tiles.length / pageSize));
  useEffect(() => { if (page >= totalPages) setPage(totalPages - 1); }, [totalPages, page]);

  const start = page * pageSize;
  const visible = tiles.slice(start, start + pageSize);

  const cols = useMemo(() => {
    const n = visible.length;
    if (n <= 1) return 'grid-cols-1';
    if (n <= 2) return 'grid-cols-2';
    if (n <= 4) return 'grid-cols-2';
    if (n <= 6) return 'grid-cols-3';
    if (n <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  }, [visible.length]);

  return (
    <div className="flex-1 flex items-stretch gap-2 min-h-0">
      {totalPages > 1 && (
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="w-8 shrink-0 self-center h-12 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <div className={`grid ${cols} gap-3 flex-1 auto-rows-fr min-h-0`}>
          {visible.map(t => (
            <VideoTile key={t.id} {...t} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-1.5 rounded-full transition-all ${i === page ? 'w-6 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground/50'}`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <button
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="w-8 shrink-0 self-center h-12 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
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

  // ── You are screen sharing ──
  if (screenStream) {
    return (
      <div className="flex h-full gap-2 p-3 min-h-0">
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
        <PeerStrip tiles={allTiles} />
      </div>
    );
  }

  // ── Someone else is presenting ──
  if (presenterId && presenterId !== myUserId) {
    const presenterTile = remoteTiles.find(t => t.id === presenterId);
    const others = allTiles.filter(t => t.id !== presenterId);

    return (
      <div className="flex h-full gap-2 p-3 min-h-0">
        <div className="flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden">
          {presenterTile ? (
            <VideoTile {...presenterTile} large />
          ) : (
            <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 text-sm">
              Waiting for presenter…
            </div>
          )}
        </div>
        <PeerStrip tiles={others} />
      </div>
    );
  }

  // ── Standard adaptive grid (no presenter) ──
  return (
    <div className="h-full p-3 flex min-h-0">
      <PagedGrid tiles={allTiles} />
    </div>
  );
}

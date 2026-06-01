import React, { useEffect, useRef, useState } from 'react';
import { MicOff, VideoOff, ChevronUp, ChevronDown } from 'lucide-react';
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
  id:      string;
  label:   string;
  stream:  MediaStream | null;
  muted:   boolean;
  mirror:  boolean;
  noVideo: boolean;
  audioMuted?: boolean;
}

// ── Optimal column calculator (ResizeObserver-driven) ──────────────────────────
// Mirrors Google Meet's algorithm: maximise the total tile area while keeping
// each tile as close to 16:9 as the container allows.
function useOptimalCols(ref: React.RefObject<HTMLElement>, count: number) {
  const [cols, setCols] = useState(1);

  useEffect(() => {
    if (count === 0) { setCols(1); return; }

    const compute = (w: number, h: number) => {
      if (!w || !h) return;
      const GAP = 8;
      let bestCols = 1, bestArea = 0;
      for (let c = 1; c <= count; c++) {
        const rows   = Math.ceil(count / c);
        const tileW  = (w - GAP * (c - 1)) / c;
        const tileH  = (h - GAP * (rows - 1)) / rows;
        // Constrain each tile to 16:9
        const eW     = Math.min(tileW, tileH * (16 / 9));
        const eH     = eW * (9 / 16);
        const area   = eW * eH * count;
        if (area > bestArea) { bestArea = area; bestCols = c; }
      }
      setCols(bestCols);
    };

    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    compute(width, height);

    const ro = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect;
      compute(w, h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [count, ref]);

  return cols;
}

// ── Single video tile ──────────────────────────────────────────────────────────
function VideoTile({
  stream, label, muted, mirror, noVideo, audioMuted, large,
}: TileData & { large?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  const initials = label
    .replace(/\s*\(You\)/, '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative w-full h-full bg-[#3c4043] rounded-xl overflow-hidden select-none">
      {stream && !noVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className={`absolute inset-0 w-full h-full object-cover
            ${mirror ? '[transform:scaleX(-1)]' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#3c4043]">
          <div
            className={`rounded-full bg-[#5f6368] flex items-center justify-center font-medium text-white
              ${large ? 'w-24 h-24 text-3xl' : 'w-14 h-14 text-lg'}`}
          >
            {initials}
          </div>
          {large && (
            <span className="text-white/60 text-sm">{label}</span>
          )}
        </div>
      )}

      {/* Bottom bar: name + muted icon */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2
        bg-gradient-to-t from-black/70 to-transparent
        flex items-end justify-between gap-2 pointer-events-none">
        <span className="text-white text-xs font-medium truncate max-w-[80%] drop-shadow">
          {label}
        </span>
        {audioMuted && (
          <div className="shrink-0 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Camera-off badge */}
      {noVideo && !(!stream) && (
        <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
          <VideoOff className="w-3.5 h-3.5 text-white/70" />
        </div>
      )}
    </div>
  );
}

// ── Adaptive paged grid ────────────────────────────────────────────────────────
// Pagination kicks in beyond 12 tiles; within a page the layout is driven by
// useOptimalCols so tiles always fill the container at the best possible size.
const PAGE_SIZE = 12;

function AdaptivePagedGrid({ tiles }: { tiles: TileData[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(tiles.length / PAGE_SIZE));
  useEffect(() => { if (page >= totalPages) setPage(totalPages - 1); }, [totalPages]);

  const visible = tiles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const cols    = useOptimalCols(containerRef, visible.length);
  const rows    = Math.ceil(visible.length / cols);

  // Center last row's orphan tile when count doesn't fill the final row
  const orphan  = visible.length % cols;

  return (
    <div className="flex-1 flex flex-col gap-2 min-h-0">
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows:    `repeat(${rows}, 1fr)`,
          gap: '8px',
        }}
      >
        {visible.map((t, i) => {
          // Place the orphan in the centre of the last row
          const isOrphan = orphan > 0 && i === visible.length - 1 && orphan === 1;
          const colStart = isOrphan ? Math.ceil(cols / 2) : undefined;
          return (
            <div
              key={t.id}
              style={isOrphan ? { gridColumn: `${colStart} / span 1` } : undefined}
            >
              <VideoTile {...t} />
            </div>
          );
        })}
      </div>

      {/* Page indicator dots */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 shrink-0 pb-1">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition-all duration-200
                ${i === page ? 'w-5 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vertical strip (presenter layouts) ────────────────────────────────────────
function PeerStrip({ tiles }: { tiles: TileData[] }) {
  const PAGE = 5;
  const [page, setPage] = useState(0);
  const total = Math.max(1, Math.ceil(tiles.length / PAGE));
  useEffect(() => { if (page >= total) setPage(total - 1); }, [total]);
  if (!tiles.length) return null;

  const visible = tiles.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <div className="w-44 shrink-0 flex flex-col gap-2 min-h-0">
      {total > 1 && (
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="h-6 shrink-0 rounded-lg bg-white/10 flex items-center justify-center
            text-white/70 hover:bg-white/20 disabled:opacity-30 transition-colors"
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

      {total > 1 && (
        <>
          <button
            onClick={() => setPage(p => Math.min(total - 1, p + 1))}
            disabled={page >= total - 1}
            className="h-6 shrink-0 rounded-lg bg-white/10 flex items-center justify-center
              text-white/70 hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-white/40 shrink-0">{page + 1}/{total}</p>
        </>
      )}
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────────────────
export default function VideoGrid({
  localStream, screenStream, remoteStreams, participants,
  myUserId, myUsername, mediaState, presenterId,
}: VideoGridProps) {

  const localTile: TileData = {
    id:         myUserId,
    label:      `${myUsername} (You)`,
    stream:     localStream,
    muted:      true,
    mirror:     true,
    noVideo:    !mediaState.video,
    audioMuted: !mediaState.audio,
  };

  // Build remote tiles from participants (source of truth), falling back to null
  // stream for peers whose WebRTC connection hasn't completed yet. This ensures
  // an avatar tile appears immediately on room join, before streams flow.
  const remoteTiles: TileData[] = participants
    .filter(p => String(p.userId) !== myUserId)
    .map(p => {
      const uid    = String(p.userId);
      const stream = remoteStreams[uid] ?? null;
      return {
        id:      uid,
        label:   p.username,
        stream,
        muted:   false,
        mirror:  false,
        noVideo: !stream,
      };
    });

  const allTiles = [localTile, ...remoteTiles];

  // ── Presenting: you are sharing your screen ─────────────────────────────────
  if (screenStream) {
    return (
      <div className="flex h-full gap-2 p-2 bg-[#202124]">
        <div className="flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden">
          <VideoTile
            id="screen"
            label={`${myUsername}'s screen`}
            stream={screenStream}
            muted noVideo={false} mirror={false}
            large
          />
        </div>
        <PeerStrip tiles={allTiles} />
      </div>
    );
  }

  // ── Presenting: someone else is sharing ─────────────────────────────────────
  if (presenterId && presenterId !== myUserId) {
    const stage  = remoteTiles.find(t => t.id === presenterId);
    const others = allTiles.filter(t => t.id !== presenterId);
    return (
      <div className="flex h-full gap-2 p-2 bg-[#202124]">
        <div className="flex-1 min-w-0 min-h-0 rounded-xl overflow-hidden">
          {stage ? (
            <VideoTile {...stage} large />
          ) : (
            <div className="w-full h-full bg-[#3c4043] rounded-xl flex items-center justify-center
              text-white/50 text-sm">
              Waiting for presenter…
            </div>
          )}
        </div>
        <PeerStrip tiles={others} />
      </div>
    );
  }

  // ── Alone in the room ────────────────────────────────────────────────────────
  if (remoteTiles.length === 0) {
    return (
      <div className="h-full bg-[#202124] flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl" style={{ aspectRatio: '16/9' }}>
          <div className="absolute inset-0 rounded-xl overflow-hidden">
            <VideoTile {...localTile} large />
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap
            px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-sm
            text-white/70 text-xs font-medium">
            You're the only one here · Share the room ID to invite others
          </div>
        </div>
      </div>
    );
  }

  // ── Standard adaptive gallery ────────────────────────────────────────────────
  return (
    <div className="h-full bg-[#202124] p-2 flex flex-col min-h-0">
      <AdaptivePagedGrid tiles={allTiles} />
    </div>
  );
}

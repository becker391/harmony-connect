import React from 'react';
import {
  Mic, MicOff, Video, VideoOff,
  Monitor, MonitorOff, MonitorX,
  PhoneOff, MoreHorizontal,
} from 'lucide-react';
import type { MediaState } from '@/types/rtc';
import type { PresenterState } from '@/hooks/usePresenter';
import ReactionsPicker from './ReactionsPicker';

interface RoomControlsProps {
  mediaState:     MediaState;
  presenterState: PresenterState;
  myUserId:       string;
  onToggleAudio:  () => void;
  onToggleVideo:  () => void;
  onToggleScreen: () => void;
  onSendReaction: (emoji: string) => void;
  onLeave:        () => void;
}

// Single icon control button, Google Meet style
function CtrlBtn({
  label, active = true, danger = false, disabled = false,
  children, onClick, tooltip,
}: {
  label:      string;
  active?:    boolean;
  danger?:    boolean;
  disabled?:  boolean;
  children:   React.ReactNode;
  onClick:    () => void;
  tooltip?:   string;
}) {
  return (
    <div className="relative group flex flex-col items-center gap-1">
      <button
        onClick={onClick}
        disabled={disabled}
        title={tooltip ?? label}
        type="button"
        className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
          disabled:opacity-40 disabled:cursor-not-allowed
          ${danger
            ? 'bg-red-600 hover:bg-red-500 text-white'
            : active
              ? 'bg-[#3c4043] hover:bg-[#4a4d51] text-white'
              : 'bg-[#ea4335] hover:bg-[#d33829] text-white'
          }
        `}
      >
        {children}
      </button>
      <span className="text-white/70 text-[10px] leading-tight select-none">{label}</span>
    </div>
  );
}

export default function RoomControls({
  mediaState, presenterState, myUserId,
  onToggleAudio, onToggleVideo, onToggleScreen, onSendReaction, onLeave,
}: RoomControlsProps) {
  const { presenterId, presenterName, requestPending } = presenterState;
  const iAmPresenting = presenterId === myUserId && mediaState.screen;
  const someoneElse   = !!presenterId && presenterId !== myUserId;

  let screenLabel   = 'Present';
  let screenTooltip = 'Share your screen';
  if (iAmPresenting)   { screenLabel = 'Stop';    screenTooltip = 'Stop presenting'; }
  else if (someoneElse){ screenLabel = 'Request'; screenTooltip = `Request to present (${presenterName} is presenting)`; }
  else if (requestPending){ screenLabel = 'Waiting…'; screenTooltip = `Waiting for ${presenterName} to allow`; }

  const ScreenIcon = iAmPresenting
    ? MonitorOff
    : someoneElse
      ? MonitorX
      : Monitor;

  return (
    // Dark bar matching the video area background
    <div className="h-20 bg-[#202124] border-t border-white/5 flex items-center justify-between px-4 shrink-0">

      {/* ── Left spacer (keeps centre group truly centred) ── */}
      <div className="w-28 hidden sm:block" />

      {/* ── Centre: main controls ─────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mic */}
        <CtrlBtn
          label={mediaState.audio ? 'Mute' : 'Unmute'}
          active={mediaState.audio}
          onClick={onToggleAudio}
        >
          {mediaState.audio
            ? <Mic    className="w-5 h-5" />
            : <MicOff className="w-5 h-5" />}
        </CtrlBtn>

        {/* Camera */}
        <CtrlBtn
          label={mediaState.video ? 'Cam off' : 'Cam on'}
          active={mediaState.video}
          onClick={onToggleVideo}
        >
          {mediaState.video
            ? <Video    className="w-5 h-5" />
            : <VideoOff className="w-5 h-5" />}
        </CtrlBtn>

        {/* Present */}
        <CtrlBtn
          label={screenLabel}
          tooltip={screenTooltip}
          active={!iAmPresenting}
          disabled={requestPending && !iAmPresenting}
          onClick={onToggleScreen}
        >
          <ScreenIcon
            className={`w-5 h-5 ${someoneElse && !iAmPresenting ? 'text-yellow-400' : ''}`}
          />
        </CtrlBtn>

        {/* Reactions */}
        <div className="flex flex-col items-center gap-1">
          <ReactionsPicker onPick={onSendReaction} />
          <span className="text-white/70 text-[10px] leading-tight select-none">React</span>
        </div>
      </div>

      {/* ── Right: leave ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <CtrlBtn label="Leave" danger onClick={onLeave}>
          <PhoneOff className="w-5 h-5" />
        </CtrlBtn>
      </div>
    </div>
  );
}

import React from 'react';
import type { FloatingReaction } from '@/hooks/useReactions';

interface Props {
  reactions: FloatingReaction[];
}

export default function ReactionsOverlay({ reactions }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
      {reactions.map(r => (
        <div
          key={r.id}
          className="absolute bottom-0 flex flex-col items-center reaction-float"
          style={{ left: `${r.x}%` }}
        >
          <span className="text-4xl drop-shadow-lg select-none">{r.emoji}</span>
          <span className="mt-1 text-[10px] font-medium text-white bg-black/50 px-1.5 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm">
            {r.username}
          </span>
        </div>
      ))}
    </div>
  );
}

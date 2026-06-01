import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '🔥', '😮', '😢', '🙌', '💯'];

interface Props {
  onPick: (emoji: string) => void;
}

export default function ReactionsPicker({ onPick }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="lg"
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full p-0"
        title="Send reaction"
      >
        <Smile className="w-5 h-5" />
      </Button>
      {open && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-popover border border-border rounded-full shadow-xl px-2 py-1.5 flex items-center gap-1 z-50">
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => { onPick(e); setOpen(false); }}
              className="text-2xl w-9 h-9 rounded-full hover:bg-muted transition-transform hover:scale-125"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

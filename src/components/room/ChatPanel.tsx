import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X } from 'lucide-react';
import type { ChatMessage } from '@/types/rtc';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  myUserId: string;
  onClose: () => void;
}

export default function ChatPanel({ messages, onSendMessage, myUserId, onClose }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="w-80 border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border">
        <span className="text-sm font-semibold text-foreground">Chat</span>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMe = String(msg.senderId) === String(myUserId);
          return (
            <div key={msg.messageId} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-muted-foreground mb-1">
                {isMe ? 'You' : msg.username}
              </span>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                isMe
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              }`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 text-sm"
        />
        <Button type="submit" size="sm" disabled={!input.trim()} className="px-3">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  MessageSquare,
  Monitor,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useSocket } from '@/contexts/SocketContext';
import { ENV } from '@/config/env';

const SEEDED_ROOMS = ["general", "dev-team", "standup"];

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const { isConnected, error, reconnect } = useSocket();
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const id = roomId.trim();
    if (id) navigate(`/room/${id}`);
  };

  const joinQuick = (id: string) => navigate(`/room/${id}`);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">
              Harmony Connect
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <Badge
                variant="outline"
                className="gap-1.5 text-green-700 border-green-300 bg-green-50 dark:text-green-400 dark:border-green-800 dark:bg-green-950"
              >
                <Wifi className="w-3 h-3" /> Connected
              </Badge>
            ) : (
              <button
                onClick={reconnect}
                title="Click to retry connection"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-destructive/40 bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
              >
                <WifiOff className="w-3 h-3" />
                Disconnected
                <RefreshCw className="w-3 h-3 ml-0.5" />
              </button>
            )}

            <span className="text-sm text-muted-foreground">
              {user?.username}
            </span>

            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-12 space-y-8">
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between">
            <span>Connection error: {error}</span>
            <button
              onClick={reconnect}
              className="flex items-center gap-1 text-xs underline underline-offset-2 hover:no-underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Room */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Join a Room</CardTitle>
              <CardDescription>
                Enter a room ID or pick a quick-join room below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Seeded quick-join chips */}
              <div className="flex flex-wrap gap-2">
                {SEEDED_ROOMS.map((r) => (
                  <button
                    key={r}
                    disabled={!isConnected}
                    onClick={() => joinQuick(r)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-accent text-sm font-medium text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    # {r}
                  </button>
                ))}
              </div>

              <form onSubmit={handleJoinRoom} className="flex gap-2">
                <Input
                  placeholder="Custom room ID…"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                />
                <Button type="submit" disabled={!isConnected}>
                  Join
                </Button>
              </form>

              {!isConnected && (
                <p className="text-xs text-muted-foreground">
                  Connect to the signaling server first.{" "}
                  <button
                    onClick={reconnect}
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    Retry
                  </button>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Features</CardTitle>
              <CardDescription>What you can do in a room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  icon: Video,
                  title: "Video Conference",
                  desc: "Full mesh peer-to-peer video and audio calls",
                },
                {
                  icon: Monitor,
                  title: "Screen Sharing",
                  desc: "Share your screen with automatic renegotiation",
                },
                {
                  icon: MessageSquare,
                  title: "Real-time Chat",
                  desc: "Text chat persisted to your backend",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Server info */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Signaling Server</p>
                <p className="font-mono text-xs text-foreground mt-1 truncate">
                  {ENV.SIGNALING_URL}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Backend API</p>
                <p className="font-mono text-xs text-foreground mt-1 truncate">
                  {ENV.API_BASE_URL}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">User</p>
                <p className="font-mono text-xs text-foreground mt-1">
                  {user?.username}{" "}
                  <span className="text-muted-foreground">
                    (id: {user?.userId})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="text-xs text-foreground mt-1">
                  {isConnected ? "🟢 Online" : "🔴 Offline"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

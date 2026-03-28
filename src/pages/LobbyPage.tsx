import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, MessageSquare, Monitor, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { ENV } from '@/config/env';

export default function LobbyPage() {
  const { user, logout } = useAuth();
  const { isConnected, error } = useSocket(user?.token ?? null);
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Video className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">RTC Connect</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="outline" className="gap-1.5 text-accent-foreground border-primary/30 bg-accent">
                  <Wifi className="w-3 h-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 text-destructive border-destructive/30">
                  <WifiOff className="w-3 h-3" /> Disconnected
                </Badge>
              )}
            </div>
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
      <main className="max-w-5xl mx-auto px-4 py-12">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            Connection error: {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Join Room */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Join a Room</CardTitle>
              <CardDescription>Enter a room ID to join or create a new room</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <Input
                  placeholder="Room ID (e.g. team-standup)"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={!isConnected}>
                  Join Room
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Features</CardTitle>
              <CardDescription>What you can do in a room</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Video Conference</p>
                  <p className="text-sm text-muted-foreground">Full mesh peer-to-peer video and audio calls</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Monitor className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Screen Sharing</p>
                  <p className="text-sm text-muted-foreground">Share your screen with renegotiation support</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Real-time Chat</p>
                  <p className="text-sm text-muted-foreground">Text chat persisted to your backend</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Info */}
        <Card className="mt-8 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Signaling Server</p>
                <p className="font-mono text-xs text-foreground mt-1 truncate">{ENV.SIGNALING_URL}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Backend API</p>
                <p className="font-mono text-xs text-foreground mt-1 truncate">{ENV.API_BASE_URL}</p>
              </div>
              <div>
                <p className="text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-foreground mt-1">{user?.userId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="text-xs text-foreground mt-1">{isConnected ? '🟢 Online' : '🔴 Offline'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

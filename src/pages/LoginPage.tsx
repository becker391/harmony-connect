import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && token && userId) {
      login(username, token, userId);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Video className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">RTC Connect</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your credentials to connect to the signaling server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">User ID</label>
              <Input
                placeholder="e.g. 42"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <Input
                placeholder="e.g. alice"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">JWT Access Token</label>
              <Input
                placeholder="Paste your JWT token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">
                Obtain this from your backend's auth endpoint
              </p>
            </div>
            <Button type="submit" className="w-full" size="lg">
              Connect
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

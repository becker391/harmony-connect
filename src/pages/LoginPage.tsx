import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

const SEEDED_USERS = [
  { username: 'alice', password: 'alice123' },
  { username: 'bob',   password: 'bob123'   },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await login(username, password);
    if (err) setError(err);
    setLoading(false);
  };

  const quickLogin = async (u: string, p: string) => {
    setError(null);
    setLoading(true);
    const err = await login(u, p);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Video className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">Harmony Connect</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to join a room
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Quick login buttons */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Test accounts
            </p>
            <div className="flex gap-2">
              {SEEDED_USERS.map(u => (
                <button
                  key={u.username}
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin(u.username, u.password)}
                  className="flex-1 py-2 px-3 rounded-lg border border-border bg-muted hover:bg-accent text-sm font-medium text-foreground transition-colors disabled:opacity-50"
                >
                  {u.username}
                  <span className="block text-xs text-muted-foreground font-normal">{u.password}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
              or sign in manually
            </div>
          </div>

          {/* Manual form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Username</label>
              <Input
                placeholder="e.g. alice"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

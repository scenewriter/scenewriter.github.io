// src/components/AuthPanel.tsx // React, 
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type U = { id: string; email?: string | null } | null;

export default function AuthPanel() {
  const [user, setUser] = useState<U>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message); setLoading(false);
  };

  const signUp = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message); setLoading(false);
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  const signInWithGoogle = async () => {
    setError(null);
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm opacity-80">{user.email ?? user.id}</div>
        <Button variant="outline" onClick={signOut} className="rounded-xl">Sign out</Button>
      </div>
    );
  }

  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); signIn(); }}>
      <Input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl w-48" />
      <Input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-xl w-36" />
      <Button disabled={loading} onClick={signIn} className="rounded-xl h-9">Sign in</Button>
      <Button type="button" variant="secondary" disabled={loading} onClick={signUp} className="rounded-xl h-9">Sign up</Button>
      <Button type="button" variant="outline" onClick={signInWithGoogle} className="rounded-xl h-9">Google</Button>
      {error && <div className="text-red-600 text-sm ml-2">{error}</div>}
    </form>
  );
}

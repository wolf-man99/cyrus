import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/data/supabase/client';
import { env } from '@/config/env';

/**
 * demo        — no backend configured; no accounts.
 * loading     — restoring a saved session.
 * signed-out  — show sign in / sign up.
 * recovery    — the user followed a password-reset link and must choose a new password.
 * signed-in   — normal use.
 */
type AuthStatus = 'demo' | 'loading' | 'signed-out' | 'recovery' | 'signed-in';

interface SignUpResult {
  /** False when the project requires email confirmation before the first sign-in. */
  signedIn: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, displayName: string | null): Promise<SignUpResult>;
  sendPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Turns Supabase auth errors into plain language. */
export function authMessage(error: { message: string; status?: number } | Error): string {
  const m = error.message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email or password is incorrect';
  if (m.includes('email not confirmed')) return 'Confirm your email first — check your inbox for the link';
  if (m.includes('user already registered')) return 'An account with this email already exists. Sign in instead.';
  if (m.includes('password should be') || m.includes('weak password')) return 'Choose a stronger password (at least 8 characters)';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Can’t reach the server. Check your connection.';
  return error.message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(env.isSupabaseConfigured ? 'loading' : 'demo');

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const recoveryLink = /type=recovery/.test(window.location.hash + window.location.search);
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus((s) => (s === 'recovery' ? s : data.session ? (recoveryLink ? 'recovery' : 'signed-in') : 'signed-out'));
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'PASSWORD_RECOVERY') setStatus('recovery');
      else setStatus((s) => (s === 'recovery' && next ? 'recovery' : next ? 'signed-in' : 'signed-out'));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo<AuthContextValue>(() => {
    const client = () => {
      if (!supabase) throw new Error('Accounts are not available in demo mode');
      return supabase;
    };
    return {
      status,
      session,
      async signIn(email, password) {
        const { error } = await client().auth.signInWithPassword({ email, password });
        if (error) throw new Error(authMessage(error));
      },
      async signUp(email, password, displayName) {
        const { data, error } = await client().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: displayName ? { display_name: displayName } : undefined },
        });
        if (error) throw new Error(authMessage(error));
        return { signedIn: Boolean(data.session) };
      },
      async sendPasswordReset(email) {
        const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
        if (error) throw new Error(authMessage(error));
      },
      async updatePassword(password) {
        const { error } = await client().auth.updateUser({ password });
        if (error) throw new Error(authMessage(error));
        // Clear the recovery token from the address bar.
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('signed-in');
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    };
  }, [status, session, supabase]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

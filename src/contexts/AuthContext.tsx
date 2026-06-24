import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'vendedor';
  storeId: string | null;
  storeName: string | null;
  plan?: string; // 'basico' | 'pro' | 'plus'
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<boolean | 'timeout'>;
  logout: () => void;
  changePassword: (oldP: string, newP: string) => Promise<boolean>;
  isInitialized: boolean;
  isSyncing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserProfile(userId: string): Promise<Omit<User, 'id' | 'email'>> {
  const { data } = await supabase
    .from('store_members')
    .select('role, store_id, stores(name, plan)')
    .eq('user_id', userId)
    .single();

  if (!data) return { role: 'vendedor', storeId: null, storeName: null, plan: 'basico' };

  return {
    role: (data.role as 'admin' | 'vendedor') || 'vendedor',
    storeId: data.store_id || null,
    storeName: (data.stores as any)?.name || null,
    plan: (data.stores as any)?.plan ?? 'basico',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null);
  const [session, setSession]     = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Read session directly from localStorage — supabase.auth.getSession() makes
    // network calls that hang on this corporate network, so we bypass it entirely.
    const initFromStorage = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? '';
        const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
        if (!raw) { setIsInitialized(true); return; }

        const stored = JSON.parse(raw) as { access_token?: string; expires_at?: number; user?: { id: string; email?: string } };
        if (!stored.access_token || !stored.user) { setIsInitialized(true); return; }

        // Check expiry (expires_at is Unix seconds)
        if (stored.expires_at && stored.expires_at < Date.now() / 1000) {
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
          setIsInitialized(true);
          return;
        }

        const fallbackProfile = { role: 'vendedor' as const, storeId: null as string | null, storeName: null as string | null };
        const profile = await Promise.race([
          fetchUserProfile(stored.user.id),
          new Promise<typeof fallbackProfile>((resolve) => setTimeout(() => resolve(fallbackProfile), 5000)),
        ]).catch(() => fallbackProfile);

        setUser({ id: stored.user.id, email: stored.user.email ?? '', ...profile });
        setSession(stored as any);
      } catch {
        // any parse error → proceed to login
      } finally {
        setIsInitialized(true);
      }
    };

    initFromStorage();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsSyncing(true);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Direct fetch — supabase-js internal fetch hangs on this network
      const res = await Promise.race([
        fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        ),
      ]);

      const data = await (res as Response).json();
      if (!(res as Response).ok || data.error_code) return false;

      // Parse JWT payload to get user info (no extra network call needed)
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));

      // Write session directly to localStorage (bypasses supabase-js setSession which also hangs)
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? '';
      const storageKey = `sb-${projectRef}-auth-token`;
      const sessionObj = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: payload.exp,
        expires_in: data.expires_in,
        token_type: 'bearer',
        user: data.user,
      };
      localStorage.setItem(storageKey, JSON.stringify(sessionObj));

      // Update React state — fetchUserProfile also uses supabase-js (DB query, not auth),
      // so race with 5s timeout in case it hangs too
      const fallbackProfile = { role: 'vendedor' as const, storeId: null as string | null, storeName: null as string | null };
      const profile = await Promise.race([
        fetchUserProfile(payload.sub),
        new Promise<typeof fallbackProfile>((resolve) => setTimeout(() => resolve(fallbackProfile), 5000)),
      ]).catch(() => fallbackProfile);
      setUser({ id: payload.sub, email: data.user.email, ...profile });
      setSession(sessionObj as any);
      setIsInitialized(true);

      return true;
    } catch {
      return 'timeout' as const;
    } finally {
      setIsSyncing(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const changePassword = async (_oldP: string, newP: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newP });
      return !error;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, login, logout, changePassword, isInitialized, isSyncing }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

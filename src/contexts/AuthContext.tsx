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
    // Get initial session — always set isInitialized even on error or timeout
    const initTimeout = setTimeout(() => setIsInitialized(true), 5000);

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      try {
        if (s?.user) {
          const profile = await fetchUserProfile(s.user.id);
          setUser({ id: s.user.id, email: s.user.email ?? '', ...profile });
          setSession(s);
        }
      } catch {
        // profile fetch failed — still mark initialized so app can redirect to login
      } finally {
        clearTimeout(initTimeout);
        setIsInitialized(true);
      }
    }).catch(() => { clearTimeout(initTimeout); setIsInitialized(true); });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      try {
        if (s?.user) {
          const profile = await fetchUserProfile(s.user.id);
          setUser({ id: s.user.id, email: s.user.email ?? '', ...profile });
        } else {
          setUser(null);
        }
      } catch {
        if (!s?.user) setUser(null);
      }
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsSyncing(true);
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<{ error: Error }>(resolve =>
          setTimeout(() => resolve({ error: new Error('timeout') }), 20000)
        ),
      ]);
      if ('error' in result && result.error) {
        if (result.error.message === 'timeout') return 'timeout';
        return false;
      }
      return true;
    } catch {
      return 'timeout';
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

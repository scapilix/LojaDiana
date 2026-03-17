import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Vendedor';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (oldP: string, newP: string) => Promise<boolean>;
  isInitialized: boolean;
  isSyncing: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedAuth = localStorage.getItem('loja_auth');
    if (savedAuth) {
      try {
        setUser(JSON.parse(savedAuth));
      } catch (e) {
        localStorage.removeItem('loja_auth');
      }
    }
    setIsInitialized(true);
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsSyncing(true);
      const { data: userData, error } = await supabase
        .from('loja_users')
        .select('id, username, password, role')
        .eq('username', username)
        .eq('password', password)
        .single();
      
      if (userData && !error) {
        const userObj: User = { 
          id: userData.id, 
          username: userData.username, 
          role: userData.role as 'Admin' | 'Vendedor'
        };
        setUser(userObj);
        localStorage.setItem('loja_auth', JSON.stringify(userObj));
        return true;
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsSyncing(false);
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('loja_auth');
  };

  const changePassword = async (oldP: string, newP: string) => {
    if (!user) return false;
    
    try {
      // First verify old password
      const { data: verify } = await supabase
        .from('loja_users')
        .select('password')
        .eq('id', user.id)
        .single();

      if (verify?.password === oldP) {
        const { error } = await supabase
          .from('loja_users')
          .update({ password: newP })
          .eq('id', user.id);

        if (!error) return true;
      }
    } catch (err) {
      console.error('Failed to update password:', err);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, isInitialized, isSyncing }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

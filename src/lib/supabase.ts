/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Corporate network proxy hangs certain fetch calls indefinitely.
// Wrap every supabase-js fetch with a 12s abort timeout so nothing blocks forever.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: true,
  },
});

// Direct PostgREST helper — bypasses supabase-js client (which can hang on this network)
// for upsert / select operations where we need reliability.
function getAuthHeaders(): Record<string, string> {
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1] ?? '';
  const raw = localStorage.getItem(`sb-${projectRef}-auth-token`);
  const token = raw ? (JSON.parse(raw) as { access_token?: string }).access_token : null;
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${token ?? supabaseAnonKey}`,
    'Content-Type': 'application/json',
  };
}

export async function pgUpsert(table: string, row: Record<string, unknown>, onConflict: string): Promise<void> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), Prefer: `resolution=merge-duplicates` },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`pgUpsert ${table}: ${res.status}`);
}

export async function pgSelect(table: string, params: Record<string, string> = {}): Promise<any[]> {
  const qs = new URLSearchParams({ select: '*', ...params }).toString();
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${qs}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`pgSelect ${table}: ${res.status}`);
  return res.json();
}

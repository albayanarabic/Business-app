import { createClient } from '@supabase/supabase-js';

// Resolve environment variables supporting Vite, Vercel Supabase integration, and Next.js naming conventions
const readEnv = (...keys: string[]): string => {
  for (const key of keys) {
    const val = (import.meta.env as Record<string, string | undefined>)[key];
    if (val && typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
};

const supabaseUrl = readEnv(
  'VITE_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL'
);

const supabaseAnonKey = readEnv(
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('your-project') &&
    supabaseAnonKey !== 'your-anon-or-publishable-key'
  );
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'biztrack_auth_token',
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

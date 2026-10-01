import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Helpful during setup if env vars are missing.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.');
}

// All app tables live in the `pool` schema (isolated from PAM/RAM).
export const supabase = createClient(url, anon, {
  db: { schema: 'pool' },
  // detectSessionInUrl (default true) is required so invite / password-recovery links
  // establish a session on load — see src/authCallback.js and App.jsx.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const SEASON_YEAR = 2026;

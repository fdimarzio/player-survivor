// Captures Supabase auth-callback info from the URL at import time — BEFORE the
// supabase client's detectSessionInUrl parses the hash and strips it from the URL.
// Invite / password-recovery links land on the site root with the tokens + a
// `type=invite` / `type=recovery` param (implicit flow → URL hash), or with
// `?code=` (PKCE) / `?error=...` (expired or already-used link) in the query.
//
// Imported first in main.jsx so this runs before supabaseClient.js is evaluated.
function parse() {
  try {
    const hash = (window.location.hash || '').replace(/^#/, '');
    const query = (window.location.search || '').replace(/^\?/, '');
    const hp = new URLSearchParams(hash);
    const qp = new URLSearchParams(query);
    const get = (k) => hp.get(k) || qp.get(k);

    const type = get('type'); // 'invite' | 'recovery' | 'signup' | 'magiclink' | null
    const error = get('error') || get('error_code') || get('error_description') || null;
    const hasTokens = !!(get('access_token') || get('code'));

    return {
      type,
      error,
      hasTokens,
      // True whenever the landing looks like an auth callback at all — used to route
      // into the invite/recovery UI instead of silently showing the normal login.
      isCallback: !!(type || error || hasTokens),
    };
  } catch {
    return { type: null, error: null, hasTokens: false, isCallback: false };
  }
}

export const authCallback = parse();

// Strip the auth tokens/params from the address bar once we've consumed them, leaving
// the user on the site root (no reload, no history entry).
export function clearAuthParamsFromUrl() {
  try {
    window.history.replaceState({}, '', window.location.pathname);
  } catch { /* no-op */ }
}

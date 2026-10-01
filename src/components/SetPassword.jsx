import { useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { claimMyTeam } from '../api.js';

// Shown after an invite / recovery link has established a session (see App.jsx).
// Sets the account password, then links the pre-created team by email via the same
// claim_my_team rpc the signup path uses, then hands control back to App.
export default function SetPassword({ recovery = false, onDone }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Link their team by email. Best-effort: App.loadProfile also claims on load,
      // so a transient failure here still resolves once the app renders.
      try { await claimMyTeam(); } catch { /* non-fatal */ }
      onDone();
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">The&nbsp;<b>Pool</b></div>
        <div className="auth-tag">
          {recovery ? 'Choose a new password' : 'Welcome! Set your password to finish joining'}
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} autoComplete="new-password" autoFocus />
          </label>
          <label>Confirm password
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required minLength={6} autoComplete="new-password" />
          </label>
          <button className="btn primary" disabled={busy} type="submit">
            {busy ? '…' : 'Set password & continue'}
          </button>
        </form>

        {err && <div className="banner err">{err}</div>}
      </div>
    </div>
  );
}

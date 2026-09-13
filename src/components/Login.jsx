import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr(''); setMsg('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { username } },
        });
        if (error) throw error;
        if (!data.session) setMsg('Account created. If email confirmation is on, check your inbox, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
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
        <div className="auth-tag">No-repeat player pool · Season 2026</div>

        <div className="seg">
          <button className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')} type="button">Sign in</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')} type="button">Create account</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          {mode === 'signup' && (
            <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Your name / team name" /></label>
          )}
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} /></label>
          <button className="btn primary" disabled={busy} type="submit">{busy ? '…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
        </form>

        {msg && <div className="banner ok">{msg}</div>}
        {err && <div className="banner err">{err}</div>}
      </div>
    </div>
  );
}

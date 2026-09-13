import { useState } from 'react';
import { createTeam } from '../api.js';

export default function CreateTeam({ season, user, onCreated }) {
  const [name, setName] = useState(user?.user_metadata?.username || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const team = await createTeam({ seasonId: season.id, name: name.trim(), userId: user.id, email: user.email });
      onCreated(team);
    } catch (e2) {
      setErr(e2.code === '23505' ? 'That team name is already taken — pick another.' : (e2.message || String(e2)));
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">Welcome to The&nbsp;<b>Pool</b></div>
        <div className="auth-tag">Name your team to join Season {season.year}.</div>
        <form onSubmit={submit} className="auth-form">
          <label>Team name<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <button className="btn primary" disabled={busy || !name.trim()} type="submit">{busy ? '…' : 'Join the league'}</button>
        </form>
        {err && <div className="banner err">{err}</div>}
      </div>
    </div>
  );
}

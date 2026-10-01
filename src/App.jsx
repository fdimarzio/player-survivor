import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import { authCallback, clearAuthParamsFromUrl } from './authCallback.js';
import { getSeason, getMyTeam, claimMyTeam } from './api.js';
import Login from './components/Login.jsx';
import SetPassword from './components/SetPassword.jsx';
import CreateTeam from './components/CreateTeam.jsx';
import MyLineup from './components/MyLineup.jsx';
import League from './components/League.jsx';
import Standings from './components/Standings.jsx';
import Admin from './components/Admin.jsx';
import CommishLineups from './components/CommishLineups.jsx';
import PicksHistory from './components/PicksHistory.jsx';
import LeagueRules from './components/LeagueRules.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [season, setSeason] = useState(null);
  const [team, setTeam] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [tab, setTab] = useState('lineup');
  const [err, setErr] = useState('');
  // Invite / password-recovery callback handling (see authCallback.js, SetPassword.jsx).
  const [pwDone, setPwDone] = useState(false);
  const [recoveryEvent, setRecoveryEvent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Recovery links fire PASSWORD_RECOVERY even if the URL `type` was already stripped.
      if (event === 'PASSWORD_RECOVERY') setRecoveryEvent(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!session?.user) return;
    setLoadingProfile(true);
    setErr('');
    try {
      const [s, t] = await Promise.all([getSeason(), getMyTeam(session.user.id)]);
      setSeason(s);
      setTeam(t || (await claimMyTeam()));
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoadingProfile(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user) loadProfile();
    else {
      setSeason(null);
      setTeam(null);
    }
  }, [session, loadProfile]);

  // ── Invite / password-recovery callback ──────────────────────────────────────
  // When the landing URL looks like an auth callback (type=invite/recovery, a
  // PASSWORD_RECOVERY event, URL-established tokens, or an error from an expired/used
  // link), route into the set-password flow instead of the normal login — and never
  // fall through silently to the login screen on a bad link.
  const isRecovery = authCallback.type === 'recovery' || recoveryEvent;
  const isInvite = authCallback.type === 'invite';
  const callbackLikely = isInvite || isRecovery || authCallback.hasTokens || !!authCallback.error;
  if (callbackLikely && !pwDone) {
    if (authCallback.error) return <AuthExpired />;
    if (session === undefined) return <div className="center muted">Finishing sign-in…</div>;
    if (session) {
      return (
        <SetPassword
          recovery={isRecovery}
          onDone={() => { clearAuthParamsFromUrl(); setRecoveryEvent(false); setPwDone(true); setTab('lineup'); }}
        />
      );
    }
    // Callback indicated, but no session established and no explicit error → bad link.
    return <AuthExpired />;
  }

  if (session === undefined) return <div className="center muted">Loading…</div>;
  if (!session) return <Login />;
  // Gate the whole app on the season being loaded so nothing renders with a null season.
  if (!season) return <div className="center muted">{err || 'Loading your season…'}</div>;

  if (session && season && !team) {
    return (
      <CreateTeam
        season={season}
        user={session.user}
        onCreated={(t) => setTeam(t)}
      />
    );
  }

  const isAdmin = !!(team?.is_admin || team?.is_commissioner);
  const isCommissioner = !!team?.is_commissioner;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          The&nbsp;<b>Pool</b>
          <span className="sub">Season {season?.year} · Week {season?.current_week}</span>
        </div>
        <div className="whoami">
          <span className="team-chip">{team?.name}{isCommissioner ? ' · commish' : ''}</span>
          <button className="btn ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'lineup' ? 'tab on' : 'tab'} onClick={() => setTab('lineup')}>My Lineup</button>
        <button className={tab === 'league' ? 'tab on' : 'tab'} onClick={() => setTab('league')}>The League</button>
        <button className={tab === 'standings' ? 'tab on' : 'tab'} onClick={() => setTab('standings')}>Standings</button>
        <button className={tab === 'history' ? 'tab on' : 'tab'} onClick={() => setTab('history')}>History</button>
        <button className={tab === 'rules' ? 'tab on' : 'tab'} onClick={() => setTab('rules')}>Rules</button>
        {isAdmin && <button className={tab === 'admin' ? 'tab on' : 'tab'} onClick={() => setTab('admin')}>Admin</button>}
        {isCommissioner && <button className={tab === 'manage' ? 'tab on' : 'tab'} onClick={() => setTab('manage')}>Manage</button>}
      </nav>

      <main className="wrap">
        {err && <div className="banner err">{err}</div>}
        {tab === 'lineup' && <MyLineup season={season} team={team} />}
        {tab === 'league' && <League season={season} team={team} />}
        {tab === 'standings' && <Standings season={season} team={team} />}
        {tab === 'history' && <PicksHistory season={season} team={team} />}
        {tab === 'rules' && <LeagueRules />}
        {tab === 'admin' && isAdmin && <Admin season={season} onSeasonChange={loadProfile} />}
        {tab === 'manage' && isCommissioner && <CommishLineups season={season} />}
      </main>
    </div>
  );
}

// Shown when an invite / recovery link is expired, already used, or otherwise invalid
// (no session could be established). Explicit, friendly — never a silent login fallback.
function AuthExpired() {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">The&nbsp;<b>Pool</b></div>
        <div className="banner err">
          This invite link has expired or is invalid — contact Paul or Frank for a new one.
        </div>
        <button
          className="btn ghost"
          type="button"
          onClick={() => { clearAuthParamsFromUrl(); window.location.reload(); }}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabaseClient.js';
import { getSeason, getMyTeam, claimMyTeam } from './api.js';
import Login from './components/Login.jsx';
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
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

import { useEffect, useState, useCallback } from 'react';
import {
  POSITIONS, POS_LABEL, getAllTeams, getPlayers, getUsedPlayerIds,
  getLineup, ensureLineup, setSlot, clearSlot, getWeekScores,
} from '../api.js';
import PlayerPicker from './PlayerPicker.jsx';

export default function CommishLineups({ season }) {
  const [teams, setTeams] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [week, setWeek] = useState(season.current_week);
  const [players, setPlayers] = useState(null);
  const [used, setUsed] = useState(new Set());
  const [slots, setSlots] = useState({});
  const [scores, setScores] = useState({});
  const [busyPos, setBusyPos] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getAllTeams().then(setTeams).catch((e) => setErr(e.message || String(e)));
    getPlayers().then(setPlayers).catch((e) => setErr(e.message || String(e)));
  }, []);

  const load = useCallback(async () => {
    if (!teamId) { setSlots({}); return; }
    setLoading(true); setErr('');
    try {
      const [usedIds, lineup, sc] = await Promise.all([
        getUsedPlayerIds(teamId, week),
        getLineup(teamId, week),
        getWeekScores(season.id, week),
      ]);
      setUsed(usedIds);
      setScores(sc);
      const m = {};
      for (const s of lineup?.lineup_slots || []) m[s.position] = s.player_id;
      setSlots(m);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [teamId, week, season.id]);

  useEffect(() => { load(); }, [load]);

  async function change(pos, playerId) {
    setBusyPos(pos); setErr(''); setMsg('');
    try {
      if (!playerId) {
        const lineup = await getLineup(teamId, week);
        if (lineup) {
          const e = await clearSlot(lineup.id, pos);
          if (e) { setErr(e.message); setBusyPos(''); return; }
        }
      } else {
        const lineup = await ensureLineup(teamId, season.id, week);
        const e = await setSlot(lineup.id, pos, playerId);
        if (e) {
          if (e.code === '23505') setErr('That player was already used earlier this season by this team.');
          else setErr(e.message);
          setBusyPos(''); return;
        }
      }
      setMsg('Saved.');
      await load();
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusyPos('');
    }
  }

  const weeks = [];
  for (let w = season.current_week; w >= 1; w--) weeks.push(w);
  const selTeam = teams?.find((t) => t.id === teamId) || null;

  return (
    <section>
      <div className="sechead">
        <h2>Manage Lineups</h2>
        <span className="pill">commissioner</span>
      </div>
      <p className="muted small">
        Edit any team's lineup for them. The no-repeat rule still applies to that
        team, but the kickoff lock does not — as commissioner you can change picks
        even after games have started.
      </p>

      <div className="card pad">
        <div className="row">
          <label className="muted small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            Team
            <select className="pick" style={{ minWidth: 220 }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Select a team…</option>
              {(teams || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.is_commissioner ? ' · commish' : ''}</option>
              ))}
            </select>
          </label>
          <label className="muted small" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            Week
            <select className="pick" style={{ maxWidth: 150 }} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
              {weeks.map((w) => <option key={w} value={w}>Week {w}{w === season.current_week ? ' · current' : ''}</option>)}
            </select>
          </label>
        </div>
      </div>

      {err && <div className="banner err">{err}</div>}
      {msg && <div className="banner ok">{msg}</div>}

      {!teamId ? (
        <p className="muted">Pick a team to edit its Week {week} lineup.</p>
      ) : loading || !players ? (
        <div className="muted">Loading {selTeam?.name}'s lineup…</div>
      ) : (
        <div className="lineup card">
          {POSITIONS.map((pos) => {
            const cur = slots[pos] || '';
            const eligible = players.byPos[pos].filter((p) => !used.has(p.id) || p.id === cur);
            const val = scores[cur];
            return (
              <div className="lrow" key={pos}>
                <span className="pos">{POS_LABEL[pos]}</span>
                <PlayerPicker
                  options={eligible}
                  value={cur || null}
                  onChange={(id) => change(pos, id || '')}
                  disabled={busyPos === pos}
                  placeholder={`Search ${POS_LABEL[pos]}…`}
                />
                <span className="score">{val != null ? Number(val).toFixed(2) : '—'}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

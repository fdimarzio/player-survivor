import { useEffect, useState, useCallback } from 'react';
import {
  POSITIONS, POS_LABEL, getPlayers, getUsedPlayerIds, getLineup,
  ensureLineup, setSlot, clearSlot, getWeekScores,
} from '../api.js';
import PlayerPicker from './PlayerPicker.jsx';
import { getLiveScores } from '../lib/espnLive.js';

export default function MyLineup({ season, team }) {
  const week = season.current_week;
  const [players, setPlayers] = useState(null);
  const [used, setUsed] = useState(new Set());
  const [slots, setSlots] = useState({});
  const [scores, setScores] = useState({});
  const [live, setLive] = useState({});
  const [busyPos, setBusyPos] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [pl, usedIds, lineup, sc] = await Promise.all([
        getPlayers(),
        getUsedPlayerIds(team.id, week),
        getLineup(team.id, week),
        getWeekScores(season.id, week),
      ]);
      setPlayers(pl);
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
  }, [team.id, week, season.id]);

  useEffect(() => { load(); }, [load]);

  // Live ESPN scores (browser-side), refreshed while games are on.
  useEffect(() => {
    if (!players) return;
    let alive = true;
    const run = () => getLiveScores(season.year, week, players).then((r) => { if (alive) setLive(r.live || {}); });
    run();
    const t = setInterval(run, 90000);
    return () => { alive = false; clearInterval(t); };
  }, [players, season.year, week]);

  async function change(pos, playerId) {
    setBusyPos(pos); setErr('');
    try {
      if (!playerId) {
        const lineup = await getLineup(team.id, week);
        if (lineup) await clearSlot(lineup.id, pos);
      } else {
        const lineup = await ensureLineup(team.id, season.id, week);
        const e = await setSlot(lineup.id, pos, playerId);
        if (e) {
          if (e.code === '23505') setErr('You already used that player earlier this season — each player is once per year.');
          else setErr(e.message);
          setBusyPos(''); return;
        }
      }
      await load();
    } catch (e2) {
      setErr(e2.message || String(e2));
    } finally {
      setBusyPos('');
    }
  }

  if (loading || !players) return <div className="muted">Loading your lineup…</div>;

  const shown = (id) => {
    if (!id) return { val: null, live: false };
    if (scores[id] != null) return { val: scores[id], live: false };
    if (live[id] != null) return { val: live[id], live: true };
    return { val: null, live: false };
  };

  const total = POSITIONS.reduce((sum, p) => sum + (shown(slots[p]).val || 0), 0);
  const filled = POSITIONS.filter((p) => slots[p]).length;

  return (
    <section>
      <div className="sechead">
        <h2>Week {week} Lineup</h2>
        <span className="pill">{filled}/6 set</span>
      </div>
      <p className="muted small">Each NFL player can be used <b>once all season</b>. Players you've already used are hidden from the lists below.</p>

      {err && <div className="banner err">{err}</div>}

      <div className="lineup card">
        {POSITIONS.map((pos) => {
          const cur = slots[pos] || '';
          const eligible = players.byPos[pos].filter((p) => !used.has(p.id) || p.id === cur);
          const s = shown(cur);
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
              <span className="score">
                {s.val != null ? s.val.toFixed(2) : '—'}
                {s.live ? <span className="livetag">live</span> : null}
              </span>
            </div>
          );
        })}
        <div className="lfoot">
          <span>Week {week} total</span>
          <span className="total">{total.toFixed(2)}</span>
        </div>
      </div>
      <p className="muted small">Scores marked <span className="livetag">live</span> come from in-progress games and finalize automatically once official stats post.</p>
    </section>
  );
}

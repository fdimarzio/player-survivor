import { useEffect, useState, useCallback } from 'react';
import {
  POSITIONS, POS_LABEL, getPlayers, getUsedPlayerIds, getLineup,
  ensureLineup, setSlot, clearSlot, getWeekScores, getGamesForWeek, submitLineup,
} from '../api.js';
import PlayerPicker from './PlayerPicker.jsx';

export default function MyLineup({ season, team }) {
  const week = season.current_week;
  const [players, setPlayers] = useState(null);
  const [used, setUsed] = useState(new Set());
  const [slots, setSlots] = useState({});
  const [scores, setScores] = useState({});
  const [games, setGames] = useState({});
  const [lineupId, setLineupId] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(null);
  const [busyPos, setBusyPos] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [pl, usedIds, lineup, sc, gm] = await Promise.all([
        getPlayers(),
        getUsedPlayerIds(team.id, week),
        getLineup(team.id, week),
        getWeekScores(season.id, week),
        getGamesForWeek(season.id, week),
      ]);
      setPlayers(pl);
      setUsed(usedIds);
      setScores(sc);
      setGames(gm);
      const m = {};
      for (const s of lineup?.lineup_slots || []) m[s.position] = s.player_id;
      setSlots(m);
      setLineupId(lineup?.id || null);
      setSubmittedAt(lineup?.submitted_at || null);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [team.id, week, season.id]);

  useEffect(() => { load(); }, [load]);

  async function change(pos, playerId) {
    setBusyPos(pos); setErr('');
    try {
      if (!playerId) {
        const lineup = await getLineup(team.id, week);
        if (lineup) {
          const e = await clearSlot(lineup.id, pos);
          if (e) { setErr(e.message); setBusyPos(''); return; }
        }
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

  async function handleSubmit() {
    if (!lineupId) return;
    setSubmitting(true); setErr('');
    try {
      await submitLineup(lineupId);
      await load();
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !players) return <div className="muted">Loading your lineup…</div>;

  const kickoff = (playerId) => {
    if (!playerId) return null;
    const p = players.byId[playerId];
    const iso = p && games[p.nfl_team];
    return iso ? new Date(iso) : null;
  };

  const now = new Date();
  const locked = POSITIONS.some((pos) => {
    const k = kickoff(slots[pos]);
    return k && k <= now;
  });

  const shown = (id) => (id && scores[id] != null ? { val: scores[id] } : { val: null });

  const total = POSITIONS.reduce((sum, p) => sum + (shown(slots[p]).val || 0), 0);
  const filled = POSITIONS.filter((p) => slots[p]).length;
  const canSubmit = filled === POSITIONS.length && !submittedAt;

  return (
    <section>
      <div className="sechead">
        <h2>Week {week} Lineup</h2>
        <span className="pill">{filled}/6 set</span>
      </div>
      <p className="muted small">Each NFL player can be used <b>once all season</b>. Players you've already used are hidden from the lists below.</p>

      {locked && <div className="banner">Locked — your first player's game has started.</div>}
      {err && <div className="banner err">{err}</div>}

      <div className="lineup card">
        {POSITIONS.map((pos) => {
          const cur = slots[pos] || '';
          const eligible = players.byPos[pos].filter((p) => {
            if (p.id === cur) return true;
            if (used.has(p.id)) return false;
            const k = kickoff(p.id);
            if (k && k <= now) return false;
            return true;
          });
          const s = shown(cur);
          return (
            <div className="lrow" key={pos}>
              <span className="pos">{POS_LABEL[pos]}</span>
              <PlayerPicker
                options={eligible}
                value={cur || null}
                onChange={(id) => change(pos, id || '')}
                disabled={busyPos === pos || locked}
                placeholder={`Search ${POS_LABEL[pos]}…`}
              />
              <span className="score">
                {s.val != null ? s.val.toFixed(2) : '—'}
              </span>
            </div>
          );
        })}
        <div className="lfoot">
          <span>Week {week} total</span>
          <span className="total">{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="lfoot-submit">
        {canSubmit && (
          <button className="btn primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Lineup'}
          </button>
        )}
        {submittedAt && <p className="muted small">Submitted ✓ (you can still edit until your first game starts)</p>}
      </div>
    </section>
  );
}

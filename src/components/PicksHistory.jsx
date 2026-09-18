import { useEffect, useState, useCallback } from 'react';
import { getLeaguePicks, getAllTeams, POSITIONS, POS_LABEL } from '../api.js';

export default function PicksHistory({ season, team }) {
  const [teams, setTeams] = useState(null);
  const [teamId, setTeamId] = useState(team.id);
  const [byWeek, setByWeek] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    getAllTeams().then(setTeams).catch((e) => setErr(e.message || String(e)));
  }, []);

  const load = useCallback(async () => {
    setErr(''); setByWeek(null);
    try {
      const weeks = [];
      for (let w = 1; w <= season.current_week; w++) weeks.push(w);
      const all = await Promise.all(weeks.map((w) => getLeaguePicks(season.id, w)));
      const out = {};
      weeks.forEach((w, i) => {
        const rows = (all[i] || []).filter((r) => r.team_id === teamId);
        const picks = {};
        let total = 0, anyRevealed = false;
        for (const r of rows) {
          picks[r.position] = r;
          if (r.revealed) anyRevealed = true;
          if (r.revealed && r.score != null) total += Number(r.score);
        }
        out[w] = { picks, total, anyRevealed };
      });
      setByWeek(out);
    } catch (e) {
      setErr(e.message || String(e));
    }
  }, [season.id, season.current_week, teamId]);

  useEffect(() => { load(); }, [load]);

  const weeks = [];
  for (let w = 1; w <= season.current_week; w++) weeks.push(w);

  return (
    <section>
      <div className="sechead">
        <h2>Pick History</h2>
        <select className="pick" style={{ maxWidth: 220, marginLeft: 'auto' }} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          {(teams || []).map((t) => (
            <option key={t.id} value={t.id}>{t.name}{t.id === team.id ? ' · you' : ''}</option>
          ))}
        </select>
      </div>
      <p className="muted small">Every week's picks by position. Opponents' current-week picks stay hidden until they unlock.</p>

      {err && <div className="banner err">{err}</div>}
      {!byWeek ? <div className="muted">Loading…</div> : (
        <div className="tablewrap card">
          <table className="stand">
            <thead>
              <tr>
                <th className="l">Week</th>
                {POSITIONS.map((pos) => <th key={pos} className="l">{POS_LABEL[pos]}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const wk = byWeek[w];
                return (
                  <tr key={w} className={w === season.current_week ? 'me' : ''}>
                    <td className="l rank">W{w}</td>
                    {POSITIONS.map((pos) => {
                      const r = wk.picks[pos];
                      if (!r) return <td key={pos} className="l muted">—</td>;
                      return (
                        <td key={pos} className="l">
                          {r.revealed ? r.player_name : <span className="muted" style={{ fontStyle: 'italic' }}>Hidden</span>}
                          {r.revealed && r.score != null ? <span className="muted small"> · {Number(r.score).toFixed(1)}</span> : null}
                        </td>
                      );
                    })}
                    <td className="tot">{wk.anyRevealed ? wk.total.toFixed(1) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

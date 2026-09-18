import { useEffect, useState } from 'react';
import { getStandings, getWeekTotals } from '../api.js';

export default function Standings({ season, team }) {
  const [week, setWeek] = useState(season.current_week);
  const [weekRows, setWeekRows] = useState(null);
  const [weekErr, setWeekErr] = useState('');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    getStandings(season.id).then(setRows).catch((e) => setErr(e.message || String(e)));
  }, [season.id]);

  useEffect(() => {
    setWeekRows(null);
    setWeekErr('');
    getWeekTotals(season.id, week).then(setWeekRows).catch((e) => setWeekErr(e.message || String(e)));
  }, [season.id, week]);

  const weekOptions = [];
  for (let w = season.current_week; w >= 1; w--) weekOptions.push(w);

  return (
    <>
      <section>
        <div className="sechead">
          <h2>Week {week} Scores</h2>
          <select value={week} onChange={(e) => setWeek(Number(e.target.value))}>
            {weekOptions.map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
        {weekErr && <div className="banner err">{weekErr}</div>}
        {!weekRows ? (
          <div className="muted">Loading week scores…</div>
        ) : (
          <div className="tablewrap card">
            <table className="stand">
              <thead>
                <tr><th className="l">#</th><th className="l">Team</th><th>Points</th></tr>
              </thead>
              <tbody>
                {weekRows.map((r, i) => (
                  <tr key={r.team_id} className={r.team_id === team.id ? 'me' : ''}>
                    <td className="l rank">{i + 1}</td>
                    <td className="l">{r.team_name}{r.team_id === team.id ? ' · you' : ''}</td>
                    <td className="tot">{Number(r.total_points).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="sechead"><h2>Overall Standings</h2><span className="muted small">Top 3 points + most weekly wins</span></div>
        {err && <div className="banner err">{err}</div>}
        {!rows ? (
          <div className="muted">Loading standings…</div>
        ) : (
          <div className="tablewrap card">
            <table className="stand">
              <thead>
                <tr><th className="l">#</th><th className="l">Team</th><th>Total</th><th>Weekly wins</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.team_id} className={r.team_id === team.id ? 'me' : ''}>
                    <td className="l rank">{i + 1}</td>
                    <td className="l">{r.team_name}{r.team_id === team.id ? ' · you' : ''}</td>
                    <td className="tot">{Number(r.total_points).toFixed(2)}</td>
                    <td>{r.weekly_wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

import { useEffect, useState } from 'react';
import { getStandings } from '../api.js';

export default function Standings({ season, team }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    getStandings(season.id).then(setRows).catch((e) => setErr(e.message || String(e)));
  }, [season.id]);

  if (err) return <div className="banner err">{err}</div>;
  if (!rows) return <div className="muted">Loading standings…</div>;

  return (
    <section>
      <div className="sechead"><h2>Standings</h2><span className="muted small">Top 3 points + most weekly wins</span></div>
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
    </section>
  );
}

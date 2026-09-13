import { useEffect, useState, useCallback } from 'react';
import { getLeaguePicks, POS_LABEL, POSITIONS } from '../api.js';
import { getLiveGames } from '../lib/espnLive.js';

function kickoffLabel(iso) {
  if (!iso) return 'kickoff';
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch { return 'kickoff'; }
}

export default function League({ season, team }) {
  const week = season.current_week;
  const [rows, setRows] = useState(null);
  const [live, setLive] = useState({});
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const data = await getLeaguePicks(season.id, week);
      setRows(data);
    } catch (e) { setErr(e.message || String(e)); }
  }, [season.id, week]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    let alive = true;
    getLiveGames(season.year, week).then((m) => { if (alive) setLive(m); });
    const t = setInterval(() => getLiveGames(season.year, week).then((m) => alive && setLive(m)), 60000);
    return () => { alive = false; clearInterval(t); };
  }, [season.year, week]);

  if (err) return <div className="banner err">{err}</div>;
  if (!rows) return <div className="muted">Loading the league…</div>;

  // group by team
  const teams = {};
  for (const r of rows) {
    if (!teams[r.team_id]) teams[r.team_id] = { name: r.team_name, picks: {} };
    teams[r.team_id].picks[r.position] = r;
  }
  const order = Object.entries(teams).sort((a, b) => {
    if (a[0] === team.id) return -1;
    if (b[0] === team.id) return 1;
    return a[1].name.localeCompare(b[1].name);
  });

  const liveCount = Object.values(live).filter((g) => g.state === 'in').length;

  return (
    <section>
      <div className="sechead">
        <h2>Around the League · Week {week}</h2>
        {liveCount > 0 && <span className="pill live">{liveCount} games live</span>}
      </div>
      <p className="muted small">Opponents' picks unlock as each player's game kicks off.</p>

      <div className="leaguegrid">
        {order.map(([tid, t]) => {
          const isMe = tid === team.id;
          let tot = 0;
          for (const pos of POSITIONS) { const p = t.picks[pos]; if (p?.revealed && p.score != null) tot += Number(p.score); }
          return (
            <div className={isMe ? 'teamcard me' : 'teamcard'} key={tid}>
              <div className="tc-head">
                <span className="tc-name">{t.name}{isMe ? ' · you' : ''}</span>
                <span className="tc-score">{tot.toFixed(1)}</span>
              </div>
              <ul className="roster">
                {POSITIONS.map((pos) => {
                  const p = t.picks[pos];
                  return (
                    <li key={pos}>
                      <span className="rp">{POS_LABEL[pos]}</span>
                      {!p ? <span className="rn muted">—</span>
                        : p.revealed
                          ? <span className="rn">{p.player_name}</span>
                          : <span className="rn hidden">Hidden · {kickoffLabel(p.kickoff_at)}</span>}
                      <span className="rs">{p?.revealed && p.score != null ? Number(p.score).toFixed(1) : ''}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

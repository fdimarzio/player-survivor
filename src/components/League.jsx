import { useEffect, useState, useCallback } from 'react';
import { getLeaguePicks, getPlayers, POS_LABEL, POSITIONS } from '../api.js';
import { getLiveScores } from '../lib/espnLive.js';

function kickoffLabel(iso) {
  if (!iso) return 'kickoff';
  try {
    return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch { return 'kickoff'; }
}

export default function League({ season, team }) {
  const week = season.current_week;
  const [rows, setRows] = useState(null);
  const [players, setPlayers] = useState(null);
  const [live, setLive] = useState({});
  const [liveCount, setLiveCount] = useState(0);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [data, pl] = await Promise.all([getLeaguePicks(season.id, week), getPlayers()]);
      setRows(data);
      setPlayers(pl);
    } catch (e) { setErr(e.message || String(e)); }
  }, [season.id, week]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!players) return;
    let alive = true;
    const run = () => getLiveScores(season.year, week, players).then((r) => {
      if (!alive) return;
      setLive(r.live || {});
      setLiveCount(r.liveCount || 0);
    });
    run();
    const t = setInterval(run, 90000);
    return () => { alive = false; clearInterval(t); };
  }, [players, season.year, week]);

  if (err) return <div className="banner err">{err}</div>;
  if (!rows) return <div className="muted">Loading the league…</div>;

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

  // score to show for a revealed pick: final if present, else live
  const shown = (p) => {
    if (!p || !p.revealed) return { val: null, live: false };
    if (p.score != null) return { val: Number(p.score), live: false };
    if (live[p.player_id] != null) return { val: live[p.player_id], live: true };
    return { val: null, live: false };
  };

  return (
    <section>
      <div className="sechead">
        <h2>Around the League · Week {week}</h2>
        {liveCount > 0 && <span className="pill live">{liveCount} games live</span>}
      </div>
      <p className="muted small">Opponents' picks unlock as each player's game kicks off. <span className="livetag">live</span> = in-progress score.</p>

      <div className="leaguegrid">
        {order.map(([tid, t]) => {
          const isMe = tid === team.id;
          let tot = 0;
          for (const pos of POSITIONS) tot += shown(t.picks[pos]).val || 0;
          return (
            <div className={isMe ? 'teamcard me' : 'teamcard'} key={tid}>
              <div className="tc-head">
                <span className="tc-name">{t.name}{isMe ? ' · you' : ''}</span>
                <span className="tc-score">{tot.toFixed(1)}</span>
              </div>
              <ul className="roster">
                {POSITIONS.map((pos) => {
                  const p = t.picks[pos];
                  const s = shown(p);
                  return (
                    <li key={pos}>
                      <span className="rp">{POS_LABEL[pos]}</span>
                      {!p ? <span className="rn muted">—</span>
                        : p.revealed
                          ? <span className="rn">{p.player_name}</span>
                          : <span className="rn hidden">Hidden · {kickoffLabel(p.kickoff_at)}</span>}
                      <span className="rs">
                        {s.val != null ? s.val.toFixed(1) : ''}
                        {s.live ? <span className="livetag">live</span> : null}
                      </span>
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

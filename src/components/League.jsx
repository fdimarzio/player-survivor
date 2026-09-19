import { useEffect, useState, useCallback } from 'react';
import { getLeaguePicks, getLineup, getScoresUpdatedAt, POS_LABEL, POSITIONS } from '../api.js';

export default function League({ season, team }) {
  const [week, setWeek] = useState(season.current_week);
  const [rows, setRows] = useState(null);
  const [mySubmittedAt, setMySubmittedAt] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const [data, myLineup] = await Promise.all([
        getLeaguePicks(season.id, week),
        getLineup(team.id, week),
        getScoresUpdatedAt(season.id, week).then(setUpdatedAt),
      ]);
      setRows(data);
      setMySubmittedAt(myLineup?.submitted_at || null);
    } catch (e) { setErr(e.message || String(e)); }
  }, [season.id, week, team.id]);

  useEffect(() => { load(); }, [load]);

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

  const shown = (p) => (p && p.revealed && p.score != null ? { val: Number(p.score) } : { val: null });

  const weeks = [];
  for (let w = season.current_week; w >= 1; w--) weeks.push(w);

  return (
    <section>
      <div className="sechead">
        <h2>Around the League · Week {week}</h2>
        <select className="pick" style={{ maxWidth: 150, marginLeft: 'auto' }} value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {weeks.map((w) => <option key={w} value={w}>Week {w}{w === season.current_week ? ' · current' : ''}</option>)}
        </select>
      </div>
      <p className="muted small">Opponents' picks unlock as each player's game kicks off.</p>

      {!mySubmittedAt && week === season.current_week && (
        <div className="banner">Submit your lineup to see other teams' picks after Sunday 1:00 PM ET.</div>
      )}

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
                          : <span className="rn hidden">Hidden</span>}
                      <span className="rs">{s.val != null ? s.val.toFixed(1) : ''}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="muted small" style={{ marginTop: 16 }}>
        {updatedAt
          ? `Scores last updated ${new Date(updatedAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`
          : 'No scores posted for this week yet'}
        {' · auto-refreshes ~every 10 min · powered by '}
        <a href="https://nflverse.com" target="_blank" rel="noreferrer">nflverse</a>
        {' (unofficial — CBS Sportsline is official)'}
      </p>
    </section>
  );
}

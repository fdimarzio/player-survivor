import { useEffect, useState } from 'react';
import { getAllTeams, setCurrentWeek } from '../api.js';

export default function Admin({ season, onSeasonChange }) {
  const [week, setWeek] = useState(season.current_week);
  const [teams, setTeams] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { getAllTeams().then(setTeams).catch((e) => setErr(e.message)); }, []);

  async function save() {
    setErr(''); setMsg('');
    try {
      await setCurrentWeek(season.id, Number(week));
      setMsg(`Current week set to ${week}.`);
      onSeasonChange?.();
    } catch (e) { setErr(e.message || String(e)); }
  }

  return (
    <section>
      <div className="sechead"><h2>Commissioner</h2></div>

      <div className="card pad">
        <h3>Current week</h3>
        <p className="muted small">Sets which week teams enter lineups for and which week is scored.</p>
        <div className="row">
          <input type="number" min="1" max="18" value={week} onChange={(e) => setWeek(e.target.value)} style={{ width: 90 }} />
          <button className="btn primary" onClick={save}>Save</button>
        </div>
        {msg && <div className="banner ok">{msg}</div>}
        {err && <div className="banner err">{err}</div>}
      </div>

      <div className="card pad">
        <h3>Teams ({teams.length})</h3>
        <ul className="teamlist">
          {teams.map((t) => (
            <li key={t.id}>{t.name}{t.is_commissioner ? ' · commissioner' : ''}</li>
          ))}
        </ul>
        <p className="muted small">Scores sync automatically (~every 10 min on game days). nflverse is the source of record; live game status shows on The League tab.</p>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { getAllTeams, getSubmissionStatus } from '../api.js';

export default function Admin({ season, onSeasonChange }) {
  const [teams, setTeams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => { getAllTeams().then(setTeams).catch((e) => setErr(e.message)); }, []);
  useEffect(() => {
    getSubmissionStatus(season.id, season.current_week).then(setSubmissions).catch((e) => setErr(e.message));
  }, [season.id, season.current_week]);

  return (
    <section>
      <div className="sechead"><h2>Commissioner</h2></div>

      <div className="card pad">
        <h3>Current week</h3>
        <p className="muted">Week {season.current_week} — advances automatically based on the NFL schedule.</p>
      </div>

      {err && <div className="banner err">{err}</div>}

      <div className="card pad">
        <h3>Submissions — Week {season.current_week}</h3>
        <ul className="teamlist">
          {submissions.map((s) => (
            <li key={s.team_id}>{s.submitted ? '✓' : '—'} {s.team_name}</li>
          ))}
        </ul>
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

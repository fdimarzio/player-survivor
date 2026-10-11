import { useState, useRef, useEffect } from 'react';

// NFL team abbreviation -> "city nickname", so D/ST and players can be found
// by searching a team's city or nickname (e.g. "minnesota" or "vikings" finds MIN),
// not just the 3-letter code. LA = Rams, LAC = Chargers.
const TEAM_ALIASES = {
  ARI: 'arizona cardinals', ATL: 'atlanta falcons', BAL: 'baltimore ravens',
  BUF: 'buffalo bills', CAR: 'carolina panthers', CHI: 'chicago bears',
  CIN: 'cincinnati bengals', CLE: 'cleveland browns', DAL: 'dallas cowboys',
  DEN: 'denver broncos', DET: 'detroit lions', GB: 'green bay packers',
  HOU: 'houston texans', IND: 'indianapolis colts', JAX: 'jacksonville jaguars',
  KC: 'kansas city chiefs', LA: 'los angeles rams', LAC: 'los angeles chargers',
  LV: 'las vegas raiders', MIA: 'miami dolphins', MIN: 'minnesota vikings',
  NE: 'new england patriots', NO: 'new orleans saints', NYG: 'new york giants',
  NYJ: 'new york jets', PHI: 'philadelphia eagles', PIT: 'pittsburgh steelers',
  SEA: 'seattle seahawks', SF: 'san francisco 49ers niners', TB: 'tampa bay buccaneers',
  TEN: 'tennessee titans', WAS: 'washington commanders',
};

// Type-to-filter player selector. Shows a filtered dropdown as you type (by name, team, city or nickname).
export default function PlayerPicker({ options, value, onChange, disabled, placeholder }) {
  const selected = options.find((o) => o.id === value) || null;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = !open ? [] : options
    .filter((o) => !q
      || o.name.toLowerCase().includes(q)
      || (o.nfl_team || '').toLowerCase().includes(q)
      || (TEAM_ALIASES[o.nfl_team] || '').includes(q))
    .slice(0, 60);

  const label = (o) => (o ? `${o.name}${o.nfl_team ? ' · ' + o.nfl_team : ''}` : '');
  function choose(o) { onChange(o.id); setQuery(''); setOpen(false); }

  return (
    <div className="ppick" ref={wrapRef}>
      <input
        className="pick"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : label(selected)}
        onFocus={() => { setQuery(''); setOpen(true); setHi(0); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (filtered[hi]) choose(filtered[hi]); }
          else if (e.key === 'Escape') { setOpen(false); }
        }}
      />
      {selected && !open && !disabled && (
        <button type="button" className="ppick-clear" onClick={() => onChange(null)} aria-label="Clear">×</button>
      )}
      {open && filtered.length > 0 && (
        <ul className="ppick-menu">
          {filtered.map((o, i) => (
            <li
              key={o.id}
              className={i === hi ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); choose(o); }}
              onMouseEnter={() => setHi(i)}
            >
              <span>{o.name}</span>
              {o.nfl_team ? <span className="ppick-team">{o.nfl_team}</span> : null}
            </li>
          ))}
        </ul>
      )}
      {open && q && filtered.length === 0 && (
        <ul className="ppick-menu"><li className="ppick-empty">No matches</li></ul>
      )}
    </div>
  );
}

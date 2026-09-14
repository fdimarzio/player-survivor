import { useState, useRef, useEffect } from 'react';

// Type-to-filter player selector. Shows a filtered dropdown as you type (by name or team).
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
    .filter((o) => !q || o.name.toLowerCase().includes(q) || (o.nfl_team || '').toLowerCase().includes(q))
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

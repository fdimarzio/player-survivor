// Client-side live scoring from ESPN. Runs in the viewer's browser (residential IP,
// which ESPN allows). Computes CBS points for in-progress / just-finished games so scores
// show live, before nflverse finalizes them server-side. Best-effort: returns empty on failure.
// Live estimates omit 2pt conversions, FG distance bonuses and safeties — those reconcile
// when the authoritative nflverse score lands.

const SB = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
const SUM = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=';

// CBS scoring (mirrors pool.scoring_rules)
const R = {
  passYd: 0.04, passTD: 5, int: -2,
  yd: 0.1, td: 6, rec: 1, fumLost: -2,
  fg: 3, xp: 1,
  dSack: 2, dInt: 2, dFumRec: 2, dTD: 6,
  pa: [[0, 6], [7, 3], [13, 1], [20, 0], [27, -1], [34, -3], [99, -5]],
  ya: [[199, 6], [249, 4], [299, 2], [99999, 0]],
};
const tier = (tbl, v) => { for (const [max, pts] of tbl) if (v <= max) return pts; return 0; };
// ESPN team abbrev -> nflverse abbrev (only the ones that differ)
const TEAM_FIX = { WSH: 'WAS', LAR: 'LA' };

function norm(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[.'’]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
const numOf = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const madeOf = (v) => numOf(String(v || '').split('/')[0]); // "2/3" -> 2

// find a statistics group by name and return {labels, athletes}
const group = (teamBlock, name) => (teamBlock.statistics || []).find((g) => g.name === name);
const idx = (g, label) => (g && g.labels ? g.labels.indexOf(label) : -1);

export async function getLiveScores(seasonYear, week, players) {
  const out = { live: {}, liveCount: 0 };
  if (!players) return out;

  // name -> our player id (offense/K); team -> our DEF id
  const nameToId = {};
  for (const p of players.all) if (p.position !== 'DEF') nameToId[norm(p.name)] = p.id;
  const defByTeam = {};
  for (const p of (players.byPos.DEF || [])) defByTeam[p.nfl_team] = p.id;

  let events;
  try {
    const sb = await (await fetch(`${SB}?dates=${seasonYear}&seasontype=2&week=${week}`)).json();
    events = sb.events || [];
  } catch { return out; }

  const active = events.filter((e) => {
    const st = e?.competitions?.[0]?.status?.type?.state;
    return st === 'in' || st === 'post';
  });
  out.liveCount = events.filter((e) => e?.competitions?.[0]?.status?.type?.state === 'in').length;

  await Promise.all(active.map(async (ev) => {
    let s;
    try { s = await (await fetch(`${SUM}${ev.id}`)).json(); } catch { return; }
    const box = s.boxscore;
    if (!box || !box.players) return;

    // team totals + scores for DEF points/yards allowed
    const totalYards = {}; const score = {};
    for (const t of box.teams || []) {
      const ab = t.team?.abbreviation;
      const ty = (t.statistics || []).find((x) => x.name === 'totalYards');
      if (ab) totalYards[ab] = numOf(ty?.displayValue);
    }
    for (const c of ev.competitions?.[0]?.competitors || []) {
      if (c.team?.abbreviation) score[c.team.abbreviation] = numOf(c.score);
    }
    const teamsInGame = (box.players || []).map((b) => b.team?.abbreviation).filter(Boolean);

    for (const b of box.players) {
      const teamAb = b.team?.abbreviation;
      const oppAb = teamsInGame.find((t) => t !== teamAb);

      // ---- offense per athlete (accumulate across groups) ----
      const acc = {}; // athleteName -> stat totals
      const add = (name, field, val) => { (acc[name] ||= {})[field] = (acc[name]?.[field] || 0) + val; };
      const pass = group(b, 'passing');
      if (pass) for (const a of pass.athletes || []) {
        const nm = a.athlete?.displayName; if (!nm) continue;
        add(nm, 'passYds', numOf(a.stats[idx(pass, 'YDS')]));
        add(nm, 'passTD', numOf(a.stats[idx(pass, 'TD')]));
        add(nm, 'int', numOf(a.stats[idx(pass, 'INT')]));
      }
      const rush = group(b, 'rushing');
      if (rush) for (const a of rush.athletes || []) {
        const nm = a.athlete?.displayName; if (!nm) continue;
        add(nm, 'yds', numOf(a.stats[idx(rush, 'YDS')]));
        add(nm, 'td', numOf(a.stats[idx(rush, 'TD')]));
      }
      const recv = group(b, 'receiving');
      if (recv) for (const a of recv.athletes || []) {
        const nm = a.athlete?.displayName; if (!nm) continue;
        add(nm, 'yds', numOf(a.stats[idx(recv, 'YDS')]));
        add(nm, 'td', numOf(a.stats[idx(recv, 'TD')]));
        add(nm, 'rec', numOf(a.stats[idx(recv, 'REC')]));
      }
      const fum = group(b, 'fumbles');
      if (fum) for (const a of fum.athletes || []) {
        const nm = a.athlete?.displayName; if (!nm) continue;
        add(nm, 'fumLost', numOf(a.stats[idx(fum, 'LOST')]));
      }
      for (const [nm, v] of Object.entries(acc)) {
        const id = nameToId[norm(nm)]; if (!id) continue;
        const pts = (v.passYds || 0) * R.passYd + (v.passTD || 0) * R.passTD + (v.int || 0) * R.int
          + (v.yds || 0) * R.yd + (v.td || 0) * R.td + (v.rec || 0) * R.rec + (v.fumLost || 0) * R.fumLost;
        out.live[id] = Math.round(pts * 100) / 100;
      }

      // ---- kickers ----
      const kick = group(b, 'kicking');
      if (kick) for (const a of kick.athletes || []) {
        const nm = a.athlete?.displayName; const id = nameToId[norm(nm)]; if (!id) continue;
        const fg = madeOf(a.stats[idx(kick, 'FG')]);
        const xp = madeOf(a.stats[idx(kick, 'XP')]);
        out.live[id] = Math.round((fg * R.fg + xp * R.xp) * 100) / 100;
      }

      // ---- DEF/ST for this team ----
      const defId = defByTeam[TEAM_FIX[teamAb] || teamAb];
      if (defId && oppAb) {
        let sacks = 0, ints = 0, fumRec = 0, dtd = 0;
        const def = group(b, 'defensive');
        if (def) for (const a of def.athletes || []) {
          sacks += numOf(a.stats[idx(def, 'SACKS')]);
          dtd += numOf(a.stats[idx(def, 'TD')]);
        }
        const intg = group(b, 'interceptions');
        if (intg) for (const a of intg.athletes || []) {
          ints += numOf(a.stats[idx(intg, 'INT')]);
          dtd += numOf(a.stats[idx(intg, 'TD')]);
        }
        if (fum) for (const a of fum.athletes || []) fumRec += numOf(a.stats[idx(fum, 'REC')]);
        const paTeam = score[oppAb] || 0;
        const yaTeam = totalYards[oppAb] || 0;
        const pts = sacks * R.dSack + ints * R.dInt + fumRec * R.dFumRec + dtd * R.dTD
          + tier(R.pa, paTeam) + tier(R.ya, yaTeam);
        out.live[defId] = Math.round(pts * 100) / 100;
      }
    }
  }));

  return out;
}

// Client-side ESPN live game status. Runs in the viewer's browser (residential IP),
// which ESPN allows — unlike the server. Best-effort: returns {} on any failure.
const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

export async function getLiveGames(seasonYear, week) {
  try {
    const res = await fetch(`${ESPN}?dates=${seasonYear}&seasontype=2&week=${week}`);
    if (!res.ok) return {};
    const json = await res.json();
    const byTeam = {};
    for (const ev of json?.events || []) {
      const comp = ev?.competitions?.[0];
      const status = comp?.status?.type; // {state: pre|in|post, shortDetail}
      for (const c of comp?.competitors || []) {
        byTeam[c.team?.abbreviation] = {
          state: status?.state,
          detail: status?.shortDetail,
          score: c.score,
        };
      }
    }
    return byTeam;
  } catch {
    return {};
  }
}

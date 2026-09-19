import { supabase, SEASON_YEAR } from './supabaseClient.js';

export const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
export const POS_LABEL = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', K: 'K', DEF: 'D/ST' };

export async function getSeason() {
  const { data, error } = await supabase.from('seasons').select('*').eq('year', SEASON_YEAR).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyTeam(userId) {
  const { data, error } = await supabase.from('teams').select('*').eq('owner_user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTeam({ seasonId, name, userId, email }) {
  const { data, error } = await supabase
    .from('teams')
    .insert({ season_id: seasonId, name, owner_user_id: userId, email, username: name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllTeams() {
  const { data, error } = await supabase.from('teams').select('id, name, is_commissioner').order('name');
  if (error) throw error;
  return data || [];
}

let _playersCache = null;
export async function getPlayers() {
  if (_playersCache) return _playersCache;
  const all = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, position, nfl_team')
      .eq('active', true)
      .order('name')
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  const byPos = {};
  for (const p of POSITIONS) byPos[p] = [];
  for (const p of all) if (byPos[p.position]) byPos[p.position].push(p);
  _playersCache = { all, byPos, byId: Object.fromEntries(all.map((p) => [p.id, p])) };
  return _playersCache;
}

// Every player_id this team has used across the whole season (for the no-repeat rule).
export async function getUsedPlayerIds(teamId, exceptWeek) {
  const { data, error } = await supabase
    .from('lineup_slots')
    .select('player_id, lineups!inner(week, team_id)')
    .eq('team_id', teamId);
  if (error) throw error;
  const used = new Set();
  for (const row of data || []) {
    if (row.player_id && row.lineups?.week !== exceptWeek) used.add(row.player_id);
  }
  return used;
}

export async function getLineup(teamId, week) {
  const { data: lu, error } = await supabase
    .from('lineups')
    .select('*, lineup_slots(*)')
    .eq('team_id', teamId)
    .eq('week', week)
    .maybeSingle();
  if (error) throw error;
  return lu;
}

export async function ensureLineup(teamId, seasonId, week) {
  const existing = await getLineup(teamId, week);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('lineups')
    .insert({ team_id: teamId, season_id: seasonId, week })
    .select('*, lineup_slots(*)')
    .single();
  if (error) throw error;
  return data;
}

export async function setSlot(lineupId, position, playerId) {
  // Upsert one position slot; unique (lineup_id, position).
  const { error } = await supabase
    .from('lineup_slots')
    .upsert({ lineup_id: lineupId, position, player_id: playerId }, { onConflict: 'lineup_id,position' });
  return error; // caller inspects (e.g. 23505 = no-repeat violation)
}

export async function clearSlot(lineupId, position) {
  const { error } = await supabase.from('lineup_slots').delete().eq('lineup_id', lineupId).eq('position', position);
  return error;
}

// player_id -> points for a week (own team / commissioner visible via RLS on stats: stats are public-read)
export async function getWeekScores(seasonId, week) {
  const map = {};
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('player_week_stats')
      .select('player_id, fantasy_points')
      .eq('season_id', seasonId)
      .eq('week', week)
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || !data.length) break;
    for (const r of data) map[r.player_id] = Number(r.fantasy_points);
    if (data.length < size) break;
    from += size;
  }
  return map;
}

export async function getLeaguePicks(seasonId, week) {
  const { data, error } = await supabase.rpc('get_league_picks', { p_season: seasonId, p_week: week });
  if (error) throw error;
  return data || [];
}

export async function getStandings(seasonId) {
  const { data, error } = await supabase.rpc('get_standings', { p_season: seasonId });
  if (error) throw error;
  return (data || []).slice().sort((a, b) => Number(b.total_points) - Number(a.total_points));
}

export async function getWeekTotals(seasonId, week) {
  const { data, error } = await supabase.rpc('get_week_totals', { p_season: seasonId, p_week: week });
  if (error) throw error;
  return (data || [])
    .map((r) => ({ team_id: r.team_id, team_name: r.team_name, total_points: Number(r.total), weekly_wins: null }))
    .sort((a, b) => b.total_points - a.total_points);
}

export async function claimMyTeam() {
  const { data, error } = await supabase.rpc('claim_my_team');
  if (error) throw error;
  return data || null;
}

export async function submitLineup(lineupId) {
  const { error } = await supabase
    .from('lineups')
    .update({ submitted_at: new Date().toISOString(), status: 'submitted' })
    .eq('id', lineupId);
  if (error) throw error;
}

// nfl_team -> kickoff_at (ISO string)
export async function getGamesForWeek(seasonId, week) {
  const { data, error } = await supabase
    .from('games')
    .select('nfl_team, kickoff_at')
    .eq('season_id', seasonId)
    .eq('week', week);
  if (error) throw error;
  const map = {};
  for (const g of data || []) map[g.nfl_team] = g.kickoff_at;
  return map;
}

export async function getSubmissionStatus(seasonId, week) {
  const { data, error } = await supabase.rpc('get_submission_status', { p_season: seasonId, p_week: week });
  if (error) throw error;
  return data || [];
}

export async function getScoresUpdatedAt(seasonId, week) {
  const { data, error } = await supabase
    .from('player_week_stats')
    .select('updated_at')
    .eq('season_id', seasonId)
    .eq('week', week)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.updated_at || null;
}

export async function setCurrentWeek(seasonId, week) {
  const { error } = await supabase.from('seasons').update({ current_week: week }).eq('id', seasonId);
  if (error) throw error;
}

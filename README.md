# The Pool — Player Survivor Pool (frontend)

Vite + React 19 app for the no-repeat fantasy football pool. Talks to the `pool` schema
in your PAM Supabase project. Scores sync automatically server-side (nflverse, every ~10 min);
live game status comes from ESPN in the browser.

## Run locally
```bash
cd player-survivor
npm install
cp .env.example .env.local     # values are already filled in (anon key is safe to expose)
npm run dev
```

## Deploy (your usual flow)
1. Create the repo `fdimarzio/player-survivor` and push (Git Bash):
   ```bash
   cd "C:/Users/fmdim/OneDrive/Documents/Premium Recurring Income/player-survivor"
   git init && git add . && git commit -m "Initial commit: The Pool"
   git branch -M main
   git remote add origin https://github.com/fdimarzio/player-survivor.git
   git push -u origin main
   ```
2. In Vercel: **Import** the repo (framework auto-detected: Vite).
3. Add Environment Variables (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL` = `https://ghdmvzlfenpmoiyyagqw.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_M0fUssf1_LGO9aJuXCq9Og_G0ZlFV_N`
4. Deploy → you get the live URL. Share that link with the league.

## Two Supabase settings
- **Exposed schemas** — `pool` is already added (done).
- **Email confirmation** — for a low-friction league, consider turning OFF
  Authentication → Providers → Email → "Confirm email" so people can sign in right after
  creating their account. (If you leave it on, they must click the confirmation email first.)

## Bootstrap the commissioner (one time)
Anyone with the link can create an account + team, but nobody can make themselves commissioner.
After **you** sign up, tell me your email (or run this in Supabase SQL editor):
```sql
update pool.teams set is_commissioner = true
where email = 'YOUR_EMAIL_HERE';
```
Commissioners see the Admin tab (set current week, view all teams) and can see all lineups.

## How it works
- **My Lineup** — pick QB/RB/WR/TE/K/D. Players you've already used this season are hidden (no-repeat is also enforced in the database).
- **The League** — opponents' picks unlock as each player's game kicks off; live game count shown.
- **Standings** — total points + weekly wins (totals are public; individual picks stay hidden until reveal).
- **Admin** (commissioner) — set the current week; scores sync automatically.

## Notes / to confirm with Paul
- Kicker PAT = 1 pt and defense points-allowed tiers for 8+ points are assumptions baked into
  `pool.scoring_rules` — confirm and I'll adjust (it's editable data, no code change).
- App scores come from nflverse and may differ slightly from official CBS numbers; CBS stays the
  source of truth and the commissioner override (`lineup_slots.points_override`) can correct any value.

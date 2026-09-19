export default function LeagueRules() {
  return (
    <section>
      <div className="sechead"><h2>League Rules</h2></div>

      <div className="card pad">
        <h3>The pool</h3>
        <p className="muted">Season-long no-repeat player pool. Each week you set a lineup of QB, RB, WR, TE, K, and D/ST. The catch: <b>each NFL player can be used only once all season</b> — once you've played someone, they're off your board for the rest of the year. Most total points at season's end wins.</p>
      </div>

      <div className="card pad">
        <h3>Weekly lineup</h3>
        <p className="muted">One player per slot: QB, RB, WR, TE, K, D/ST. Players you've already used are hidden from your pick lists automatically.</p>
      </div>

      <div className="card pad">
        <h3>Deadlines &amp; reveal</h3>
        <p className="muted">Picks lock at each player's kickoff — you can't select a player whose game has already started, and your whole lineup locks once your earliest-kicking player takes the field (so a Thursday or early player means your lineup is due before that game). Everyone's full lineups become visible <b>Sunday at 1:00 PM ET</b>; before then, opponents' picks stay hidden.</p>
      </div>

      <div className="card pad">
        <h3>Scoring — CBS Sportsline fractional</h3>
        <table className="stand" style={{ marginTop: 8 }}>
          <tbody>
            <tr><td className="l"><b>Passing</b></td><td className="l">1 pt / 25 yds (0.04/yd) · TD 5 · INT −2 · 2-pt 1</td></tr>
            <tr><td className="l"><b>Rushing</b></td><td className="l">1 pt / 10 yds (0.1/yd) · TD 6 · 2-pt 2</td></tr>
            <tr><td className="l"><b>Receiving</b></td><td className="l">1 pt / 10 yds (0.1/yd) · TD 6 · <b>1 / reception</b> · 2-pt 2</td></tr>
            <tr><td className="l"><b>Fumble lost</b></td><td className="l">−2</td></tr>
            <tr><td className="l"><b>Kicking</b></td><td className="l">FG 3 (+1 for 45–49, +2 for 50+) · extra point 1</td></tr>
            <tr><td className="l"><b>Defense / ST</b></td><td className="l">Sack 2 · INT 2 · Fumble rec 2 · TD 6 · Safety 2</td></tr>
            <tr><td className="l"><b>Points allowed</b></td><td className="l">0 → 6 · 1–7 → 3 · 8+ → 0</td></tr>
            <tr><td className="l"><b>Yards allowed</b></td><td className="l">0–199 → 6 · 200–249 → 4 · 250–299 → 2 · 300+ → 0</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card pad">
        <h3>Other</h3>
        <p className="muted">Reusing a player you've already played scores 0 with a 20-point deduction. A player ruled out for COVID/illness (not injury) may be replaced. Multi-position players score at their CBS-listed position.</p>
      </div>

      <p className="muted small">This app is an unofficial live helper. CBS Sportsline remains the official source of scoring; the commissioner can override any value to match CBS.</p>
    </section>
  );
}

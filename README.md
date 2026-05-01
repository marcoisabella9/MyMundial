# MyMundial

MyMundial is a World Cup 2026 prediction app for making match picks, building a knockout bracket, choosing tournament awards, and competing with friends in private leagues.

The current V1 is intentionally focused on the fastest useful product:

- Group-stage score predictions
- Dynamic Round of 32 knockout bracket advancement
- Knockout score predictions, including draw scores with an advancing team
- Tournament award picks
- Account-based saved predictions
- Private leagues with invite links, member standings, activity, and prediction viewing
- A Supabase-backed foundation for auth, profiles, leagues, memberships, picks, and awards

Lineups, scorer picks, man of the match picks, and live player-event props are post-MVP.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://localhost:5173/
```

## Validate

```bash
npm run lint
npm run build
```

## User Guide

### Create An Account

1. Open MyMundial.
2. Use the account panel to sign up or sign in.
3. Set a display name so friends can recognize you in private leagues.
4. Picks autosave to your account after you change or confirm them.

Signed-out users can browse the app, but predictions are not saved unless they sign in.

### Make Group Stage Picks

1. Go to `Groups`.
2. Pick scores for each group-stage match.
3. A 0-0 draw is allowed.
4. The group tables update from your score picks.
5. The top two teams in each group plus the best third-place teams feed the Round of 32 bracket.

### Make Knockout Picks

1. Go to `Bracket` or use `Next match` from the match screen.
2. Pick a score for each knockout match.
3. If the score is tied, choose which team advances.
4. Winners automatically advance through the bracket.
5. The third-place match is included alongside the final path.

### Autosave Predictions

After signing in, score changes autosave to your account after a short moment.

For a default 0-0 score, use `Confirm current pick` to mark that score as intentional. For knockout draws, choose the team that advances; the pick autosaves after the advancing team is selected.

### Pick Tournament Awards

1. Go to `Awards`.
2. Choose each award category.
3. Search for a candidate or type a custom name.
4. Golden Glove is limited to goalkeeper-style picks.
5. Save each award pick so it appears in your account and league views.

### Create Or Join A Private League

1. Go to `Leagues`.
2. Create a league and copy the invite link.
3. Share the invite link or invite code with friends.
4. Friends can sign in, open the link, and join the league.
5. League standings show members, saved-pick progress, points, activity, and a `View picks` action for each member.

Until real match results are synced and settled, league points are draft totals based on saved picks and award selections.

## Current Production Notes

- Frontend: React and Vite.
- Hosting: Vercel.
- Auth/database: Supabase.
- Football data target: API-FOOTBALL/API-SPORTS for V1 fixtures, scores, standings, and results.
- Server-side football provider sync is still the next major production milestone.

## Roadmap

Next production priorities:

1. Harden private league QA across multiple real accounts and devices.
2. Implement football results sync for fixtures, scores, standings, and final results.
3. Add scoring settlement jobs for match winners, exact scores, goal difference, bracket advancement, and awards.
4. Add lock rules for match kickoff and award deadlines.
5. Polish mobile flows and onboarding before sharing widely.

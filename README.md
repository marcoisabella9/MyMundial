# CupCall World Cup Predictor

CupCall is a React/Vite prototype for a World Cup bracket prediction app. It focuses on group-stage predictions, a dynamically generated round-of-32 knockout bracket, match-level score picks, player-level scorer and man-of-the-match picks, points previews, and private/global competition concepts.

## Current Prototype

- 48-team World Cup 2026 group-stage setup with 12 groups of 4 teams.
- Editable group match predictions that update group tables.
- Round-of-32 bracket slots that unlock from predicted group outcomes.
- Match detail flow with previous/next navigation across group matches and generated knockout matches.
- Score prediction controls with points preview.
- Lineup-based scorer and MOTM selection with scorer limits tied to predicted goals.
- Clean desktop-first UI with responsive groundwork for later mobile refinement.
- Data API planning surfaced in Linear for live scores, events, lineups, and stats.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173/`.

## Validate

```bash
npm run lint
npm run build
```

## Tech Stack

- React
- Vite
- Lucide React icons
- ESLint

## Next Product Areas

- Persist user brackets and private league membership.
- Connect a football data API for fixtures, live events, lineups, player stats, and results.
- Add authentication and invite flows.
- Add global/private leaderboards and award picks.
- Harden World Cup 2026 knockout slot mapping against the final FIFA bracket rules.

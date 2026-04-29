# MyMundial

MyMundial is a World Cup prediction app moving from prototype toward a playable beta. V1 is intentionally focused on team winners, match scores, bracket advancement, private leagues, leaderboards, and tournament awards so the product can ship quickly.

## Current Foundation

- React/Vite browser app.
- Local beta persistence for profile, league, saved scores, and saved predictions.
- Supabase migration for profiles, leagues, members, teams, fixtures, predictions, award picks, and scoring results.
- Supabase Edge Function scaffold for server-side football provider sync.
- Provider adapter contract with API-FOOTBALL as the first V1 target and Sportmonks as a backup check.
- `.env.example` documenting required browser and server variables.

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

## Production Setup Sequence

1. Create a Supabase project.
2. Apply `supabase/migrations/202604280001_initial_schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in Supabase browser keys.
4. Add provider keys as server-side secrets, not Vite variables.
5. Deploy `supabase/functions/sync-football-data`.
6. Trial API-FOOTBALL for fixtures, teams, scores, standings, and results.
7. Replace local beta persistence with Supabase table reads/writes.

## Deferred Until After MVP

Lineups, scorer picks, MOTM, live player events, and other player-level props are intentionally out of the launch path. They should come back only after accounts, private leagues, saved predictions, football result sync, and settlement are working reliably.

## Important Security Rule

Football API keys and Supabase service-role keys must never be exposed to the browser. Keep them in Supabase Edge Functions or a server-side API layer.

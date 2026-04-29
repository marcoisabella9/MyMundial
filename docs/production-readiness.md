# MyMundial Production Readiness

This repo now has the first production foundation for MyMundial while still running as a local browser app. The V1 target is a lean MVP: team winners, match scores, bracket advancement, private leagues, leaderboards, and tournament awards.

## What Is Implemented

- App metadata is renamed to `mymundial`.
- `.env.example` documents the required Supabase and football provider variables.
- `supabase/migrations/202604280001_initial_schema.sql` defines the first production data model.
- `supabase/functions/sync-football-data/` contains an Edge Function scaffold for server-side provider sync.
- `src/lib/football/` contains the provider contract plus mock, API-FOOTBALL-first, and Sportmonks-backup adapter metadata.
- `src/lib/localBetaStore.js` persists demo profile, league, scores, and saved predictions locally.
- The app UI now surfaces account setup, private league setup, saved prediction state, API-FOOTBALL readiness, and Supabase readiness.

## Production Sequence

1. Create the Supabase project.
2. Apply the SQL migration from `supabase/migrations`.
3. Configure env vars from `.env.example`.
4. Deploy the `sync-football-data` Edge Function.
5. Trial API-FOOTBALL with a real key for fixtures, teams, standings, scores, and final results.
6. Replace local beta persistence with Supabase table reads/writes.
7. Deploy the browser app to Vercel or Netlify.

## Post-MVP Scope

Lineups, scorer picks, MOTM, live player events, and player identity reconciliation are deliberately deferred. Keeping them out of V1 lowers data-provider cost, reduces API surface area, and keeps the first beta focused on the bracket/social prediction loop.

## Important Boundary

Football provider keys must stay server-side. The React app should only read normalized MyMundial resources from Supabase or app-owned API routes.

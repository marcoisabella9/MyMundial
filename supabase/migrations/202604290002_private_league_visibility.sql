-- Allow private league members to see each other's MVP pick summaries.
-- This powers league standings and member prediction views for invited users.

drop policy if exists "mvp predictions league member read" on public.mvp_prediction_drafts;
create policy "mvp predictions league member read" on public.mvp_prediction_drafts
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.league_members viewer
      join public.league_members picked_user
        on picked_user.league_id = viewer.league_id
      where viewer.user_id = auth.uid()
        and picked_user.user_id = mvp_prediction_drafts.user_id
    )
  );

drop policy if exists "mvp awards league member read" on public.mvp_award_picks;
create policy "mvp awards league member read" on public.mvp_award_picks
  for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.league_members viewer
      join public.league_members picked_user
        on picked_user.league_id = viewer.league_id
      where viewer.user_id = auth.uid()
        and picked_user.user_id = mvp_award_picks.user_id
    )
  );

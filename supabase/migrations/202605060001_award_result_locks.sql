-- Lock award picks once an official award result has been saved.
-- This keeps settled tournament awards immutable for every user/account.

drop policy if exists "mvp awards own insert" on public.mvp_award_picks;
create policy "mvp awards own insert" on public.mvp_award_picks
  for insert with check (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.mvp_award_results
      where mvp_award_results.award_key = mvp_award_picks.award_key
    )
  );

drop policy if exists "mvp awards own update before settled" on public.mvp_award_picks;
create policy "mvp awards own update before settled" on public.mvp_award_picks
  for update using (
    user_id = auth.uid()
    and result_state <> 'settled'
    and not exists (
      select 1
      from public.mvp_award_results
      where mvp_award_results.award_key = mvp_award_picks.award_key
    )
  )
  with check (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.mvp_award_results
      where mvp_award_results.award_key = mvp_award_picks.award_key
    )
  );

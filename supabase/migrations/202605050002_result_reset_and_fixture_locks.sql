-- Admin controls for MVP settlement resets and fixture-level prediction locks.
-- The lock table lets admins freeze picks before kickoff while manual/API result
-- settlement remains reversible during testing.

create table if not exists public.mvp_fixture_locks (
  fixture_key text primary key,
  fixture_type text not null check (fixture_type in ('group', 'bracket')),
  stage text not null,
  home_team text not null,
  away_team text not null,
  source text not null default 'manual',
  locked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mvp_fixture_locks enable row level security;

drop policy if exists "fixture locks readable" on public.mvp_fixture_locks;
create policy "fixture locks readable" on public.mvp_fixture_locks
  for select to authenticated using (true);

drop policy if exists "fixture locks admin insert" on public.mvp_fixture_locks;
create policy "fixture locks admin insert" on public.mvp_fixture_locks
  for insert with check (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "fixture locks admin update" on public.mvp_fixture_locks;
create policy "fixture locks admin update" on public.mvp_fixture_locks
  for update using (exists (select 1 from public.app_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "fixture locks admin delete" on public.mvp_fixture_locks;
create policy "fixture locks admin delete" on public.mvp_fixture_locks
  for delete using (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "fixture results admin delete" on public.mvp_fixture_results;
create policy "fixture results admin delete" on public.mvp_fixture_results
  for delete using (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "award results admin delete" on public.mvp_award_results;
create policy "award results admin delete" on public.mvp_award_results
  for delete using (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "mvp predictions own insert" on public.mvp_prediction_drafts;
create policy "mvp predictions own insert" on public.mvp_prediction_drafts
  for insert with check (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.mvp_fixture_locks
      where mvp_fixture_locks.fixture_key = mvp_prediction_drafts.fixture_key
    )
  );

drop policy if exists "mvp predictions own update before settled" on public.mvp_prediction_drafts;
create policy "mvp predictions own update before settled" on public.mvp_prediction_drafts
  for update using (
    user_id = auth.uid()
    and result_state <> 'settled'
    and not exists (
      select 1
      from public.mvp_fixture_locks
      where mvp_fixture_locks.fixture_key = mvp_prediction_drafts.fixture_key
    )
  )
  with check (
    user_id = auth.uid()
    and not exists (
      select 1
      from public.mvp_fixture_locks
      where mvp_fixture_locks.fixture_key = mvp_prediction_drafts.fixture_key
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'touch_mvp_fixture_locks_updated_at'
  ) then
    create trigger touch_mvp_fixture_locks_updated_at
      before update on public.mvp_fixture_locks
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

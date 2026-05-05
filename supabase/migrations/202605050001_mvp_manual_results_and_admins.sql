-- MVP manual result settlement tables.
-- API-FOOTBALL sync can later write into these same normalized result tables.

create table if not exists public.app_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.mvp_fixture_results (
  fixture_key text primary key,
  fixture_type text not null check (fixture_type in ('group', 'bracket')),
  stage text not null,
  home_team text not null,
  away_team text not null,
  home_score integer not null check (home_score >= 0),
  away_score integer not null check (away_score >= 0),
  advancing_team text,
  status text not null default 'final',
  source text not null default 'manual',
  settled_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mvp_award_results (
  award_key text primary key,
  award_label text not null,
  recipient text not null,
  source text not null default 'manual',
  settled_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mvp_fixture_results_type_stage on public.mvp_fixture_results (fixture_type, stage);

alter table public.app_admins enable row level security;
alter table public.mvp_fixture_results enable row level security;
alter table public.mvp_award_results enable row level security;

drop policy if exists "app admins read own" on public.app_admins;
create policy "app admins read own" on public.app_admins
  for select using (user_id = auth.uid());

drop policy if exists "fixture results readable" on public.mvp_fixture_results;
create policy "fixture results readable" on public.mvp_fixture_results
  for select to authenticated using (true);

drop policy if exists "fixture results admin insert" on public.mvp_fixture_results;
create policy "fixture results admin insert" on public.mvp_fixture_results
  for insert with check (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "fixture results admin update" on public.mvp_fixture_results;
create policy "fixture results admin update" on public.mvp_fixture_results
  for update using (exists (select 1 from public.app_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "award results readable" on public.mvp_award_results;
create policy "award results readable" on public.mvp_award_results
  for select to authenticated using (true);

drop policy if exists "award results admin insert" on public.mvp_award_results;
create policy "award results admin insert" on public.mvp_award_results
  for insert with check (exists (select 1 from public.app_admins where user_id = auth.uid()));

drop policy if exists "award results admin update" on public.mvp_award_results;
create policy "award results admin update" on public.mvp_award_results
  for update using (exists (select 1 from public.app_admins where user_id = auth.uid()))
  with check (exists (select 1 from public.app_admins where user_id = auth.uid()));

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'touch_mvp_fixture_results_updated_at'
  ) then
    create trigger touch_mvp_fixture_results_updated_at
      before update on public.mvp_fixture_results
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'touch_mvp_award_results_updated_at'
  ) then
    create trigger touch_mvp_award_results_updated_at
      before update on public.mvp_award_results
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

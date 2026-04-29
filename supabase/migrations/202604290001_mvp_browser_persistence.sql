-- MVP browser persistence for the pre-provider MyMundial app.
-- These tables store stable app fixture keys such as A-1 and r32-0 while
-- API-FOOTBALL fixture UUID sync is still being built.

create table if not exists public.mvp_prediction_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fixture_key text not null,
  fixture_type text not null check (fixture_type in ('group', 'bracket')),
  stage text not null,
  home_team text not null,
  away_team text not null,
  predicted_home_score integer not null check (predicted_home_score >= 0),
  predicted_away_score integer not null check (predicted_away_score >= 0),
  advancing_team text,
  locked_at timestamptz,
  result_state text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fixture_key)
);

create index if not exists idx_mvp_prediction_drafts_user_id on public.mvp_prediction_drafts (user_id);
create index if not exists idx_mvp_prediction_drafts_fixture_key on public.mvp_prediction_drafts (fixture_key);

alter table public.mvp_prediction_drafts enable row level security;

drop policy if exists "profiles read league members" on public.profiles;
create policy "profiles read league members" on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.league_members self_member
      join public.league_members other_member
        on other_member.league_id = self_member.league_id
      where self_member.user_id = auth.uid()
        and other_member.user_id = profiles.id
    )
  );

drop policy if exists "leagues owner readable" on public.leagues;
create policy "leagues owner readable" on public.leagues
  for select using (owner_id = auth.uid());

create policy "mvp predictions own read" on public.mvp_prediction_drafts
  for select using (user_id = auth.uid());

create policy "mvp predictions own insert" on public.mvp_prediction_drafts
  for insert with check (user_id = auth.uid());

create policy "mvp predictions own update before settled" on public.mvp_prediction_drafts
  for update using (user_id = auth.uid() and result_state <> 'settled')
  with check (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'touch_mvp_prediction_drafts_updated_at'
  ) then
    create trigger touch_mvp_prediction_drafts_updated_at
      before update on public.mvp_prediction_drafts
      for each row execute function public.touch_updated_at();
  end if;
end;
$$;

create policy "league activity member insert" on public.league_activity
  for insert with check (public.is_league_member(league_id));

create or replace function public.join_league_by_invite(target_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_league_id uuid;
begin
  select id into target_league_id
  from public.leagues
  where upper(invite_code) = upper(trim(target_invite_code))
  limit 1;

  if target_league_id is null then
    raise exception 'Invite code not found';
  end if;

  insert into public.league_members (league_id, user_id, role)
  values (target_league_id, auth.uid(), 'member')
  on conflict (league_id, user_id) do nothing;

  insert into public.league_activity (league_id, actor_id, activity_type, metadata)
  values (
    target_league_id,
    auth.uid(),
    'joined',
    jsonb_build_object('invite_code', upper(trim(target_invite_code)))
  );

  return target_league_id;
end;
$$;

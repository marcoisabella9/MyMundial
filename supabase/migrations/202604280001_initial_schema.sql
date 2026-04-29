-- MyMundial initial production schema.
-- Apply this in Supabase SQL editor or through the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  favorite_team_id uuid,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_team_id text not null,
  fifa_code text not null,
  name text not null,
  country text,
  flag_url text,
  group_code text,
  seed text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_team_id),
  unique (fifa_code)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_player_id text not null,
  team_id uuid references public.teams(id) on delete set null,
  display_name text not null,
  shirt_number integer,
  position text,
  date_of_birth date,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_player_id)
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_fixture_id text not null,
  stage text not null,
  group_code text,
  kickoff_at timestamptz,
  venue text,
  home_team_id uuid references public.teams(id) on delete restrict,
  away_team_id uuid references public.teams(id) on delete restrict,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled',
  lock_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_fixture_id)
);

create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  shirt_number integer,
  position text,
  formation_slot text,
  grid_row integer,
  grid_col integer,
  is_starter boolean not null default true,
  created_at timestamptz not null default now(),
  unique (fixture_id, team_id, player_id)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  related_player_id uuid references public.players(id) on delete set null,
  event_type text not null,
  minute integer,
  extra_minute integer,
  detail text,
  home_score integer,
  away_score integer,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  invite_code text not null unique,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  unique (league_id, user_id)
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  predicted_home_score integer not null check (predicted_home_score >= 0),
  predicted_away_score integer not null check (predicted_away_score >= 0),
  predicted_winner_team_id uuid references public.teams(id) on delete set null,
  motm_player_id uuid references public.players(id) on delete set null,
  locked_at timestamptz,
  settled_at timestamptz,
  result_state text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, fixture_id)
);

create table if not exists public.prediction_scorers (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  goal_index integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.award_picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  award_key text not null,
  player_id uuid references public.players(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  locked_at timestamptz,
  settled_at timestamptz,
  result_state text not null default 'pending',
  points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, award_key)
);

create table if not exists public.scoring_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fixture_id uuid references public.fixtures(id) on delete cascade,
  prediction_id uuid references public.predictions(id) on delete cascade,
  source text not null,
  points integer not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now()
);

create table if not exists public.league_activity (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.provider_sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  resource text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_message text
);

create index if not exists idx_fixtures_kickoff_at on public.fixtures (kickoff_at);
create index if not exists idx_fixtures_status on public.fixtures (status);
create index if not exists idx_players_team_id on public.players (team_id);
create index if not exists idx_events_fixture_id_minute on public.events (fixture_id, minute, extra_minute);
create index if not exists idx_predictions_user_id on public.predictions (user_id);
create index if not exists idx_predictions_fixture_id on public.predictions (fixture_id);
create index if not exists idx_league_members_user_id on public.league_members (user_id);
create index if not exists idx_scoring_results_user_id on public.scoring_results (user_id);

create or replace function public.is_league_member(target_league_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league_id
      and lm.user_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.fixtures enable row level security;
alter table public.lineups enable row level security;
alter table public.events enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_scorers enable row level security;
alter table public.award_picks enable row level security;
alter table public.scoring_results enable row level security;
alter table public.league_activity enable row level security;
alter table public.provider_sync_runs enable row level security;

create policy "profiles read own" on public.profiles for select using (id = auth.uid());
create policy "profiles update own" on public.profiles for update using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());

create policy "football reference data readable" on public.teams for select to authenticated using (true);
create policy "players readable" on public.players for select to authenticated using (true);
create policy "fixtures readable" on public.fixtures for select to authenticated using (true);
create policy "lineups readable" on public.lineups for select to authenticated using (true);
create policy "events readable" on public.events for select to authenticated using (true);

create policy "leagues member readable" on public.leagues for select using (public.is_league_member(id));
create policy "leagues owner insert" on public.leagues for insert with check (owner_id = auth.uid());
create policy "leagues owner update" on public.leagues for update using (owner_id = auth.uid());

create policy "league members readable to members" on public.league_members for select using (public.is_league_member(league_id) or user_id = auth.uid());
create policy "league members insert self" on public.league_members for insert with check (user_id = auth.uid());

create policy "predictions own read" on public.predictions for select using (user_id = auth.uid());
create policy "predictions own insert" on public.predictions for insert with check (user_id = auth.uid());
create policy "predictions own update before settled" on public.predictions for update using (user_id = auth.uid() and settled_at is null);

create policy "prediction scorers own read" on public.prediction_scorers for select using (
  exists (
    select 1 from public.predictions p
    where p.id = prediction_id and p.user_id = auth.uid()
  )
);
create policy "prediction scorers own write" on public.prediction_scorers for all using (
  exists (
    select 1 from public.predictions p
    where p.id = prediction_id and p.user_id = auth.uid() and p.settled_at is null
  )
);

create policy "award picks own read" on public.award_picks for select using (user_id = auth.uid());
create policy "award picks own insert" on public.award_picks for insert with check (user_id = auth.uid());
create policy "award picks own update before settled" on public.award_picks for update using (user_id = auth.uid() and settled_at is null);

create policy "scoring own read" on public.scoring_results for select using (user_id = auth.uid());
create policy "league activity member read" on public.league_activity for select using (public.is_league_member(league_id));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger touch_teams_updated_at before update on public.teams for each row execute function public.touch_updated_at();
create trigger touch_players_updated_at before update on public.players for each row execute function public.touch_updated_at();
create trigger touch_fixtures_updated_at before update on public.fixtures for each row execute function public.touch_updated_at();
create trigger touch_leagues_updated_at before update on public.leagues for each row execute function public.touch_updated_at();
create trigger touch_predictions_updated_at before update on public.predictions for each row execute function public.touch_updated_at();
create trigger touch_award_picks_updated_at before update on public.award_picks for each row execute function public.touch_updated_at();

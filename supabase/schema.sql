create table if not exists public.players (
  id text primary key,
  name text not null,
  number integer not null,
  pos text not null default 'MID'
);

create table if not exists public.fixtures (
  id text primary key,
  type text not null,
  date text not null,
  home_team text not null,
  away_team text not null,
  opponent text not null,
  venue text not null,
  competition text not null,
  status text not null default 'upcoming',
  opp_pos integer not null default 6
);

create table if not exists public.availability (
  fixture_id text not null references public.fixtures(id) on delete cascade,
  player_id text not null references public.players(id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no', 'unset')),
  primary key (fixture_id, player_id)
);

create table if not exists public.lineups (
  fixture_id text primary key references public.fixtures(id) on delete cascade,
  starters jsonb not null default '{}'::jsonb,
  subs jsonb not null default '[]'::jsonb
);

create table if not exists public.results (
  fixture_id text primary key references public.fixtures(id) on delete cascade,
  our_score integer not null default 0,
  their_score integer not null default 0,
  stats jsonb not null default '{}'::jsonb
);

alter table public.players enable row level security;
alter table public.fixtures enable row level security;
alter table public.availability enable row level security;
alter table public.lineups enable row level security;
alter table public.results enable row level security;

create policy "Public team app can read players" on public.players for select to anon, authenticated using (true);
create policy "Public team app can write players" on public.players for all to anon, authenticated using (true) with check (true);
create policy "Public team app can read fixtures" on public.fixtures for select to anon, authenticated using (true);
create policy "Public team app can write fixtures" on public.fixtures for all to anon, authenticated using (true) with check (true);
create policy "Public team app can read availability" on public.availability for select to anon, authenticated using (true);
create policy "Public team app can write availability" on public.availability for all to anon, authenticated using (true) with check (true);
create policy "Public team app can read lineups" on public.lineups for select to anon, authenticated using (true);
create policy "Public team app can write lineups" on public.lineups for all to anon, authenticated using (true) with check (true);
create policy "Public team app can read results" on public.results for select to anon, authenticated using (true);
create policy "Public team app can write results" on public.results for all to anon, authenticated using (true) with check (true);

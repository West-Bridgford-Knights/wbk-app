create table if not exists public.players (
  id text primary key,
  name text not null,
  number integer not null,
  pos text not null default 'MID',
  active boolean not null default true
);

alter table public.players add column if not exists active boolean not null default true;

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
  opp_pos integer not null default 6,
  scraped_at timestamptz
);

-- Nullable and left unset by manual fixture adds — only the scraper stamps it, on every
-- run (upsert doesn't touch untouched rows, so a plain default wouldn't advance on update).
alter table public.fixtures add column if not exists scraped_at timestamptz;

create table if not exists public.availability (
  date date not null,
  player_id text not null references public.players(id) on delete cascade,
  status text not null check (status in ('yes', 'maybe', 'no', 'unset')),
  primary key (date, player_id)
);

-- Migrate older installs from fixture-keyed availability to date-keyed availability, so a
-- rescraped/rescheduled fixture (which the scraper upserts by a stable FA fixture id) never
-- wipes out player responses via the old on-delete-cascade foreign key.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'availability' and column_name = 'fixture_id'
  ) then
    alter table public.availability add column if not exists date date;
    update public.availability a
      set date = substring(f.date from 1 for 10)::date
      from public.fixtures f
      where a.fixture_id = f.id and a.date is null and f.date ~ '^\d{4}-\d{2}-\d{2}';
    delete from public.availability where date is null;
    alter table public.availability drop constraint if exists availability_pkey;
    alter table public.availability alter column date set not null;
    alter table public.availability drop column fixture_id;
    alter table public.availability add primary key (date, player_id);
  end if;
end $$;

create table if not exists public.lineups (
  fixture_id text primary key references public.fixtures(id) on delete cascade,
  starters jsonb not null default '{}'::jsonb,
  subs jsonb not null default '[]'::jsonb,
  captain_id text references public.players(id) on delete set null
);

alter table public.lineups add column if not exists captain_id text references public.players(id) on delete set null;

create table if not exists public.results (
  fixture_id text primary key references public.fixtures(id) on delete cascade,
  our_score integer not null default 0,
  their_score integer not null default 0,
  stats jsonb not null default '{}'::jsonb
);

create table if not exists public.payments (
  period text not null,
  player_id text not null references public.players(id) on delete cascade,
  status text not null check (status in ('paid', 'unpaid', 'excluded')) default 'unpaid',
  primary key (period, player_id)
);

-- Widen the status check for installs created before "excluded" existed.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('paid', 'unpaid', 'excluded'));

create table if not exists public.pitch_availability (
  facility_id text not null,
  date date not null,
  slot_start text not null,
  facility_name text,
  available boolean not null,
  block_reason text,
  checked_at timestamptz not null default now(),
  primary key (facility_id, date, slot_start)
);

-- Migrate installs from before a second pitch was tracked, when facility_id didn't exist
-- and the primary key was just (date, slot_start).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pitch_availability' and column_name = 'facility_id'
  ) then
    alter table public.pitch_availability add column facility_id text;
    update public.pitch_availability set facility_id = 'd3bc83f0-a754-40a9-ba16-d7e31e00252d' where facility_id is null;
    alter table public.pitch_availability alter column facility_id set not null;
    alter table public.pitch_availability drop constraint if exists pitch_availability_pkey;
    alter table public.pitch_availability add primary key (facility_id, date, slot_start);
  end if;
end $$;

create table if not exists public.league_table (
  team text primary key,
  pos integer not null,
  played integer not null default 0,
  won integer not null default 0,
  drawn integer not null default 0,
  lost integer not null default 0,
  goal_diff integer,
  points integer not null default 0,
  scraped_at timestamptz not null default now()
);

alter table public.players enable row level security;
alter table public.fixtures enable row level security;
alter table public.availability enable row level security;
alter table public.lineups enable row level security;
alter table public.results enable row level security;
alter table public.payments enable row level security;
alter table public.pitch_availability enable row level security;
alter table public.league_table enable row level security;

drop policy if exists "Public team app can read players" on public.players;
drop policy if exists "Public team app can write players" on public.players;
drop policy if exists "Public team app can read fixtures" on public.fixtures;
drop policy if exists "Public team app can write fixtures" on public.fixtures;
drop policy if exists "Public team app can read availability" on public.availability;
drop policy if exists "Public team app can write availability" on public.availability;
drop policy if exists "Public team app can read lineups" on public.lineups;
drop policy if exists "Public team app can write lineups" on public.lineups;
drop policy if exists "Public team app can read results" on public.results;
drop policy if exists "Public team app can write results" on public.results;
drop policy if exists "Public team app can read payments" on public.payments;
drop policy if exists "Public team app can write payments" on public.payments;
drop policy if exists "Public team app can read pitch_availability" on public.pitch_availability;
drop policy if exists "Public team app can write pitch_availability" on public.pitch_availability;
drop policy if exists "Public team app can read league_table" on public.league_table;
drop policy if exists "Public team app can write league_table" on public.league_table;

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
create policy "Public team app can read payments" on public.payments for select to anon, authenticated using (true);
create policy "Public team app can write payments" on public.payments for all to anon, authenticated using (true) with check (true);
create policy "Public team app can read pitch_availability" on public.pitch_availability for select to anon, authenticated using (true);
create policy "Public team app can write pitch_availability" on public.pitch_availability for all to anon, authenticated using (true) with check (true);
create policy "Public team app can read league_table" on public.league_table for select to anon, authenticated using (true);
create policy "Public team app can write league_table" on public.league_table for all to anon, authenticated using (true) with check (true);

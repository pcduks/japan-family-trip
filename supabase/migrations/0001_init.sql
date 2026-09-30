-- Six Across Japan: Phase 1 schema (PRD §7) with row-level security.
-- Only emails listed in public.travellers can read or write anything.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------------ tables

create table if not exists public.travellers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null default 'member' check (role in ('planner', 'member')),
  created_at timestamptz not null default now()
);
create unique index if not exists travellers_email_lower on public.travellers (lower(email));

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  query text not null,
  lat double precision,
  lng double precision,
  region text not null default '',
  kind text not null,
  blurb text not null default '',
  winter text not null default '',
  bump text not null default '',
  google_place_id text,
  -- food list fields (kind = 'food')
  category text,
  area text,
  note text,
  closed_note text,
  list_rating text,
  sort int not null default 0
);

create table if not exists public.place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  type text not null check (type in ('photo', 'video')),
  -- YouTube video id, or Places photo resource name
  source_ref text not null,
  -- videos: pinned = shown. photos: pinned = shown first, false = hidden.
  pinned boolean not null default true,
  sort int not null default 0,
  title text,
  created_at timestamptz not null default now(),
  unique (place_id, type, source_ref)
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  title text not null default '',
  color text not null default '#555555',
  exit_airport text not null default '',
  is_candidate boolean not null default false,
  parent_route_id uuid references public.routes (id) on delete set null,
  sort int not null default 0
);

create table if not exists public.stays (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  place_id uuid not null references public.places (id),
  start_date date not null,
  nights int not null check (nights > 0),
  leg_note text,
  sort int not null default 0
);

-- Day trips from a stay, and stops made on the way in (kind = 'via').
create table if not exists public.stay_daytrips (
  stay_id uuid not null references public.stays (id) on delete cascade,
  place_id uuid not null references public.places (id),
  kind text not null default 'daytrip' check (kind in ('daytrip', 'via')),
  sort int not null default 0,
  primary key (stay_id, place_id, kind)
);

create table if not exists public.trip_modules (
  place_id uuid primary key references public.places (id) on delete cascade,
  sort int not null default 0
);

create table if not exists public.votes (
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  route_id uuid not null references public.routes (id) on delete cascade,
  rank int not null check (rank between 1 and 10),
  updated_at timestamptz not null default now(),
  primary key (traveller_id, route_id),
  unique (traveller_id, rank)
);

create table if not exists public.hearts (
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (traveller_id, place_id)
);

-- Phase 2 tables, created now so the model is complete.
create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  date date not null,
  title text not null default '',
  unique (route_id, date)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  time time,
  place_id uuid references public.places (id),
  note text not null default '',
  split_group text
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  stay_id uuid not null references public.stays (id) on delete cascade,
  name text not null,
  url text,
  price_jpy int,
  cancel_by date,
  status text not null default 'idea' check (status in ('idea', 'held', 'booked', 'paid')),
  notes text
);

-- ---------------------------------------------------------------- helpers

create or replace function public.current_traveller_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.travellers
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.is_traveller()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_traveller_id() is not null $$;

create or replace function public.is_planner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.travellers
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'planner'
  )
$$;

-- Replace the caller's whole ranking in one transaction.
-- route_codes[1] is their first choice.
create or replace function public.submit_ranking(route_codes text[])
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  me uuid := public.current_traveller_id();
  i int;
begin
  if me is null then
    raise exception 'not an invited traveller';
  end if;
  delete from public.votes where traveller_id = me;
  for i in 1 .. coalesce(array_length(route_codes, 1), 0) loop
    insert into public.votes (traveller_id, route_id, rank)
    select me, r.id, i from public.routes r where r.code = route_codes[i] and r.is_candidate;
  end loop;
end
$$;

-- Block sign-ups from anyone not on the list (belt and braces: also turn off
-- "Allow new users to sign up" in Supabase Auth settings).
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.travellers where lower(email) = lower(event -> 'user' ->> 'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'This trip app is private to invited travellers.'));
end
$$;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;
grant select on public.travellers to supabase_auth_admin;

-- -------------------------------------------------------------------- RLS

alter table public.travellers enable row level security;
alter table public.places enable row level security;
alter table public.place_media enable row level security;
alter table public.routes enable row level security;
alter table public.stays enable row level security;
alter table public.stay_daytrips enable row level security;
alter table public.trip_modules enable row level security;
alter table public.votes enable row level security;
alter table public.hearts enable row level security;
alter table public.days enable row level security;
alter table public.activities enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "auth admin reads travellers" on public.travellers;
create policy "auth admin reads travellers" on public.travellers
  for select to supabase_auth_admin using (true);

do $$
declare t text;
begin
  -- Everyone on the trip can read everything.
  foreach t in array array['travellers','places','place_media','routes','stays','stay_daytrips',
                           'trip_modules','votes','hearts','days','activities','bookings'] loop
    execute format('drop policy if exists "travellers read" on public.%I', t);
    execute format('create policy "travellers read" on public.%I for select to authenticated using (public.is_traveller())', t);
  end loop;
  -- Only the planner edits the trip itself.
  foreach t in array array['places','place_media','routes','stays','stay_daytrips','trip_modules',
                           'days','activities','bookings'] loop
    execute format('drop policy if exists "planner writes" on public.%I', t);
    execute format('create policy "planner writes" on public.%I for all to authenticated using (public.is_planner()) with check (public.is_planner())', t);
  end loop;
end
$$;

-- Each traveller writes only their own votes and hearts.
drop policy if exists "own votes" on public.votes;
create policy "own votes" on public.votes for all to authenticated
  using (traveller_id = public.current_traveller_id())
  with check (traveller_id = public.current_traveller_id());

drop policy if exists "own hearts" on public.hearts;
create policy "own hearts" on public.hearts for all to authenticated
  using (traveller_id = public.current_traveller_id())
  with check (traveller_id = public.current_traveller_id());

-- ---------------------------------------------------------------- realtime

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.votes, public.hearts, public.place_media;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

-- Japan trip planner v2 (PRD §10). Everything lives in its own schema, `trip`,
-- so it can sit next to the earlier app's tables in `public` without clashing.
-- Safe to re-run.
--
-- After running it once, make sure `trip` is in Dashboard → Settings → API →
-- "Exposed schemas" (the block at the end tries to do this for you).

create extension if not exists pgcrypto;
create schema if not exists trip;

-- ------------------------------------------------------------------ tables

create table if not exists trip.travellers (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null default 'member' check (role in ('planner', 'member')),
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists trip_travellers_email_lower on trip.travellers (lower(email));

create table if not exists trip.regions (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null check (status in ('in_plan','option','candidate_fits','candidate_maybe','day_trip','not_this_trip')),
  summary text,
  fit text,
  suggested_nights jsonb,
  sources text[] not null default '{}',
  instagram_official text,
  hashtags text[] not null default '{}',
  videos text[] not null default '{}',
  checked_at date,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists trip.places (
  id text primary key,
  region_id text not null references trip.regions (id),
  name text not null,
  kind text not null,
  size text not null check (size in ('main','short','evening','day_trip','meal')),
  why text,
  hours text,
  closed_weekdays text[] not null default '{}',
  effort_for_her text not null default 'low' check (effort_for_her in ('low','moderate','high')),
  effort_note text,
  status text check (status is null or status in ('avoid_for_her')),
  price text,
  booking text,
  links jsonb not null default '{}'::jsonb,
  food jsonb,
  google_place_id text,
  lat double precision,
  lng double precision,
  source text,
  checked_at date,
  verified boolean not null default false,
  updated_by text,
  created_from_drop_id uuid,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists trip_places_region on trip.places (region_id);

create table if not exists trip.closures (
  id text primary key,
  place_id text not null references trip.places (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  source text
);
create index if not exists trip_closures_place on trip.closures (place_id);

create table if not exists trip.versions (
  id text primary key,
  name text not null,
  owner_id text references trip.travellers (id) on delete cascade,
  pace text not null check (pace in ('gentle','balanced','full')),
  status text not null check (status in ('plan','alternative','personal','legacy')),
  parent_version_id text,
  gains text,
  gives_up text,
  travel_hours_est numeric,
  shared boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Exactly one plan.
create unique index if not exists trip_versions_one_plan on trip.versions ((status = 'plan')) where status = 'plan';

create table if not exists trip.stays (
  id uuid primary key default gen_random_uuid(),
  version_id text not null references trip.versions (id) on delete cascade,
  region_id text not null references trip.regions (id),
  start_date date not null,
  end_date date not null,
  lodging_type text check (lodging_type is null or lodging_type in ('hotel','rental','ryokan')),
  note text,
  sort int not null default 0
);
create index if not exists trip_stays_version on trip.stays (version_id, sort);

create table if not exists trip.days (
  id uuid primary key default gen_random_uuid(),
  version_id text not null references trip.versions (id) on delete cascade,
  date date not null,
  title text,
  unique (version_id, date)
);

create table if not exists trip.day_items (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references trip.days (id) on delete cascade,
  place_id text references trip.places (id) on delete set null,
  slot text not null check (slot in ('early','morning','afternoon','evening','rest')),
  crew text not null default 'everyone' check (crew in ('everyone','early','easy')),
  note text,
  sort int not null default 0
);

create table if not exists trip.suggestions (
  id uuid primary key default gen_random_uuid(),
  from_version_id text references trip.versions (id) on delete set null,
  author_id text not null references trip.travellers (id) on delete cascade,
  diff jsonb not null,
  comment text,
  status text not null default 'open' check (status in ('open','accepted','declined')),
  decided_by text references trip.travellers (id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists trip.plan_history (
  id uuid primary key default gen_random_uuid(),
  version_id text not null references trip.versions (id) on delete cascade,
  actor_id text not null references trip.travellers (id),
  change jsonb not null,
  at timestamptz not null default now()
);

create table if not exists trip.votes (
  traveller_id text not null references trip.travellers (id) on delete cascade,
  kind text not null check (kind in ('pace','rank','mustdo')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (traveller_id, kind)
);

create table if not exists trip.drops (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references trip.travellers (id) on delete cascade,
  caption text,
  image_paths text[] not null default '{}',
  text text,
  url text,
  created_at timestamptz not null default now(),
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','done','failed'))
);

create table if not exists trip.drop_places (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references trip.drops (id) on delete cascade,
  place_id text references trip.places (id) on delete set null,
  extracted jsonb not null,
  match_confidence text check (match_confidence in ('high','low','none')),
  confirmed_by text references trip.travellers (id)
);

create table if not exists trip.reactions (
  id uuid primary key default gen_random_uuid(),
  traveller_id text not null references trip.travellers (id) on delete cascade,
  target_type text not null,
  target_id text not null,
  kind text not null check (kind in ('heart','not_for_us')),
  created_at timestamptz not null default now(),
  unique (traveller_id, target_type, target_id, kind)
);

create table if not exists trip.comments (
  id uuid primary key default gen_random_uuid(),
  author_id text not null references trip.travellers (id) on delete cascade,
  target_type text not null,
  target_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists trip_comments_target on trip.comments (target_type, target_id);

create table if not exists trip.bookings (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  name text not null,
  url text,
  price_jpy int,
  cancel_by date,
  status text not null default 'idea' check (status in ('idea','held','booked','paid')),
  booked_by text references trip.travellers (id),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists trip.deadlines (
  id text primary key,
  date date not null,
  item text not null,
  source text,
  done boolean not null default false
);

create table if not exists trip.imports (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  payload_hash text not null,
  report jsonb not null,
  at timestamptz not null default now()
);

-- Small key/value settings (vote reveal etc.), planner-only.
create table if not exists trip.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create or replace function trip.current_traveller_id()
returns text
language sql stable security definer set search_path = trip, public
as $$
  select id from trip.travellers
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function trip.is_traveller()
returns boolean
language sql stable security definer set search_path = trip, public
as $$ select trip.current_traveller_id() is not null $$;

create or replace function trip.is_planner()
returns boolean
language sql stable security definer set search_path = trip, public
as $$
  select exists (
    select 1 from trip.travellers
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'planner'
  )
$$;

-- A version is editable by its owner (personal versions) or by a planner.
create or replace function trip.can_edit_version(vid text)
returns boolean
language sql stable security definer set search_path = trip, public
as $$
  select trip.is_planner() or exists (
    select 1 from trip.versions v
    where v.id = vid and v.status = 'personal' and v.owner_id = trip.current_traveller_id()
  )
$$;

-- Rank votes stay hidden until everyone has voted, or a planner reveals them.
create or replace function trip.rank_votes_revealed()
returns boolean
language sql stable security definer set search_path = trip, public
as $$
  select coalesce((select (value ->> 'rank_revealed')::boolean from trip.settings where key = 'votes'), false)
      or (select count(*) from trip.votes where kind = 'rank') >= (select count(*) from trip.travellers)
$$;

-- Block sign-ups from anyone not on the list. Point Auth → Hooks → "Before
-- user created" at this function (and turn off "Allow new users to sign up").
create or replace function trip.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql security definer set search_path = trip, public
as $$
begin
  if exists (select 1 from trip.travellers where lower(email) = lower(event -> 'user' ->> 'email')) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403, 'message', 'This trip app is private to invited travellers.'));
end
$$;

-- Accept a suggestion: replace the plan's stays, log history, close the suggestion. Planners only.
create or replace function trip.accept_suggestion(sid uuid)
returns void
language plpgsql security definer set search_path = trip, public
as $$
declare
  s trip.suggestions;
  plan_id text;
  me text := trip.current_traveller_id();
  before_stays jsonb;
  st jsonb;
  i int := 0;
begin
  if not trip.is_planner() then raise exception 'planners only'; end if;
  select * into s from trip.suggestions where id = sid and status = 'open';
  if s.id is null then raise exception 'suggestion not open'; end if;
  select id into plan_id from trip.versions where status = 'plan';
  select coalesce(jsonb_agg(jsonb_build_object('region', region_id, 'from', start_date, 'to', end_date,
           'nights', end_date - start_date, 'lodging', lodging_type, 'note', note) order by sort), '[]'::jsonb)
    into before_stays from trip.stays where version_id = plan_id;
  delete from trip.stays where version_id = plan_id;
  for st in select * from jsonb_array_elements(s.diff -> 'stays') loop
    insert into trip.stays (version_id, region_id, start_date, end_date, lodging_type, note, sort)
    values (plan_id, st ->> 'region', (st ->> 'from')::date, (st ->> 'to')::date, nullif(st ->> 'lodging', ''), st ->> 'note', i);
    i := i + 1;
  end loop;
  if s.diff ? 'pace' then update trip.versions set pace = s.diff ->> 'pace' where id = plan_id; end if;
  update trip.versions set updated_at = now() where id = plan_id;
  insert into trip.plan_history (version_id, actor_id, change)
  values (plan_id, me, jsonb_build_object('summary', s.diff -> 'summary', 'before', before_stays, 'after', s.diff -> 'stays',
                                          'suggestion_id', s.id, 'suggested_by', s.author_id));
  update trip.suggestions set status = 'accepted', decided_by = me, decided_at = now() where id = sid;
end
$$;

-- Revert the plan to the "before" of a history entry. Planners only.
create or replace function trip.revert_plan(hid uuid)
returns void
language plpgsql security definer set search_path = trip, public
as $$
declare
  h trip.plan_history;
  me text := trip.current_traveller_id();
  current_stays jsonb;
  st jsonb;
  i int := 0;
begin
  if not trip.is_planner() then raise exception 'planners only'; end if;
  select * into h from trip.plan_history where id = hid;
  if h.id is null then raise exception 'no such change'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('region', region_id, 'from', start_date, 'to', end_date,
           'nights', end_date - start_date, 'lodging', lodging_type, 'note', note) order by sort), '[]'::jsonb)
    into current_stays from trip.stays where version_id = h.version_id;
  delete from trip.stays where version_id = h.version_id;
  for st in select * from jsonb_array_elements(h.change -> 'before') loop
    insert into trip.stays (version_id, region_id, start_date, end_date, lodging_type, note, sort)
    values (h.version_id, st ->> 'region', (st ->> 'from')::date, (st ->> 'to')::date, nullif(st ->> 'lodging', ''), st ->> 'note', i);
    i := i + 1;
  end loop;
  update trip.versions set updated_at = now() where id = h.version_id;
  insert into trip.plan_history (version_id, actor_id, change)
  values (h.version_id, me, jsonb_build_object('summary', jsonb_build_array('reverted a change'), 'before', current_stays, 'after', h.change -> 'before', 'reverted', h.id));
end
$$;

grant execute on function trip.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function trip.hook_before_user_created(jsonb) from authenticated, anon, public;
grant usage on schema trip to supabase_auth_admin;
grant select on trip.travellers to supabase_auth_admin;

-- ------------------------------------------------------------------ grants

grant usage on schema trip to anon, authenticated, service_role;
grant all on all tables in schema trip to authenticated, service_role;
grant all on all sequences in schema trip to authenticated, service_role;
grant execute on all functions in schema trip to authenticated, service_role;
alter default privileges in schema trip grant all on tables to authenticated, service_role;
alter default privileges in schema trip grant all on sequences to authenticated, service_role;
alter default privileges in schema trip grant execute on functions to authenticated, service_role;

-- -------------------------------------------------------------------- RLS

do $$
declare t text;
begin
  foreach t in array array['travellers','regions','places','closures','versions','stays','days','day_items',
                           'suggestions','plan_history','votes','drops','drop_places','reactions','comments',
                           'bookings','deadlines','imports','settings'] loop
    execute format('alter table trip.%I enable row level security', t);
    execute format('drop policy if exists "travellers read" on trip.%I', t);
    execute format('create policy "travellers read" on trip.%I for select to authenticated using (trip.is_traveller())', t);
  end loop;
  -- Library, bookings, deadlines, settings, travellers: planners write (Claude writes through the service role API).
  foreach t in array array['travellers','regions','places','closures','bookings','deadlines','settings','imports'] loop
    execute format('drop policy if exists "planner writes" on trip.%I', t);
    execute format('create policy "planner writes" on trip.%I for all to authenticated using (trip.is_planner()) with check (trip.is_planner())', t);
  end loop;
end
$$;

drop policy if exists "auth admin reads travellers" on trip.travellers;
create policy "auth admin reads travellers" on trip.travellers for select to supabase_auth_admin using (true);

-- Versions: members create and edit their own personal versions; planners edit anything.
drop policy if exists "own versions" on trip.versions;
create policy "own versions" on trip.versions for all to authenticated
  using (trip.is_planner() or (status = 'personal' and owner_id = trip.current_traveller_id()))
  with check (trip.is_planner() or (status = 'personal' and owner_id = trip.current_traveller_id()));
-- Private drafts are only visible to their owner (and planners).
drop policy if exists "travellers read" on trip.versions;
create policy "travellers read" on trip.versions for select to authenticated
  using (trip.is_traveller() and (shared or owner_id = trip.current_traveller_id() or trip.is_planner()));

drop policy if exists "edit stays" on trip.stays;
create policy "edit stays" on trip.stays for all to authenticated
  using (trip.can_edit_version(version_id)) with check (trip.can_edit_version(version_id));
drop policy if exists "edit days" on trip.days;
create policy "edit days" on trip.days for all to authenticated
  using (trip.can_edit_version(version_id)) with check (trip.can_edit_version(version_id));
drop policy if exists "edit day items" on trip.day_items;
create policy "edit day items" on trip.day_items for all to authenticated
  using (exists (select 1 from trip.days d where d.id = day_id and trip.can_edit_version(d.version_id)))
  with check (exists (select 1 from trip.days d where d.id = day_id and trip.can_edit_version(d.version_id)));

-- Votes: own rows; rank votes of others are hidden until revealed.
drop policy if exists "travellers read" on trip.votes;
create policy "travellers read" on trip.votes for select to authenticated
  using (trip.is_traveller() and (kind <> 'rank' or traveller_id = trip.current_traveller_id() or trip.rank_votes_revealed()));
drop policy if exists "own votes" on trip.votes;
create policy "own votes" on trip.votes for all to authenticated
  using (traveller_id = trip.current_traveller_id()) with check (traveller_id = trip.current_traveller_id());

-- Suggestions: authors open and withdraw; planners decide.
drop policy if exists "open suggestions" on trip.suggestions;
create policy "open suggestions" on trip.suggestions for insert to authenticated
  with check (author_id = trip.current_traveller_id());
drop policy if exists "decide suggestions" on trip.suggestions;
create policy "decide suggestions" on trip.suggestions for update to authenticated
  using (trip.is_planner() or author_id = trip.current_traveller_id())
  with check (trip.is_planner() or author_id = trip.current_traveller_id());
drop policy if exists "withdraw suggestions" on trip.suggestions;
create policy "withdraw suggestions" on trip.suggestions for delete to authenticated
  using (author_id = trip.current_traveller_id() and status = 'open');

drop policy if exists "planner history" on trip.plan_history;
create policy "planner history" on trip.plan_history for insert to authenticated with check (trip.is_planner());

-- Drops, reactions, comments: own rows.
drop policy if exists "own drops" on trip.drops;
create policy "own drops" on trip.drops for all to authenticated
  using (author_id = trip.current_traveller_id() or trip.is_planner())
  with check (author_id = trip.current_traveller_id() or trip.is_planner());
drop policy if exists "own drop places" on trip.drop_places;
create policy "own drop places" on trip.drop_places for all to authenticated
  using (trip.is_planner() or exists (select 1 from trip.drops d where d.id = drop_id and d.author_id = trip.current_traveller_id()))
  with check (trip.is_planner() or exists (select 1 from trip.drops d where d.id = drop_id and d.author_id = trip.current_traveller_id()));
drop policy if exists "own reactions" on trip.reactions;
create policy "own reactions" on trip.reactions for all to authenticated
  using (traveller_id = trip.current_traveller_id()) with check (traveller_id = trip.current_traveller_id());
drop policy if exists "own comments" on trip.comments;
create policy "own comments" on trip.comments for all to authenticated
  using (author_id = trip.current_traveller_id() or trip.is_planner())
  with check (author_id = trip.current_traveller_id());

-- ---------------------------------------------------------------- realtime

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table trip.votes, trip.versions, trip.stays, trip.suggestions, trip.comments, trip.reactions;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

-- ------------------------------------------------------ expose the schema
-- PostgREST only serves schemas listed in pgrst.db_schemas. Append `trip` if
-- the authenticator role exists (Supabase) and it is not there yet.
do $$
declare cur text;
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    select coalesce((select split_part(s, '=', 2) from unnest(coalesce(r.setconfig, '{}')) s where s like 'pgrst.db_schemas=%'), 'public, graphql_public, storage')
      into cur from pg_db_role_setting r join pg_roles p on p.oid = r.setrole where p.rolname = 'authenticator' and r.setdatabase = 0;
    cur := coalesce(cur, 'public, graphql_public, storage');
    if position('trip' in cur) = 0 then
      execute format('alter role authenticator set pgrst.db_schemas = %L', cur || ', trip');
    end if;
    notify pgrst, 'reload config';
  end if;
end
$$;

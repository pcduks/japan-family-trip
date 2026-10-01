-- Desejos: each person's answers to the experience cards, hidden from everyone
-- (the planner included) until all six have finished, so nobody herds anybody.

create table if not exists public.wish_profiles (
  id uuid primary key references public.travellers (id) on delete cascade,
  -- Quick facts: walk_km, stairs, midday_rest, food_limits[], early, ny_choice, with_help
  facts jsonb not null default '{}'::jsonb,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One row per traveller and card: `${traveller_id}:${card_id}`.
create table if not exists public.wishes (
  id text primary key,
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  card_id text not null,
  answer text not null check (answer in ('no', 'like', 'must')),
  updated_at timestamptz not null default now(),
  unique (traveller_id, card_id)
);

alter table public.wish_profiles enable row level security;
alter table public.wishes enable row level security;

-- True once everyone has finished, or when the planner forces the reveal
-- (settings row 'wishes_reveal' = true) because someone never will.
create or replace function public.wishes_revealed()
returns boolean language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.wish_profiles where finished_at is not null)
      >= (select count(*) from public.travellers)
    or coalesce((select (value)::boolean from public.settings where id = 'wishes_reveal'), false)
$$;

drop policy if exists "profiles read" on public.wish_profiles;
create policy "profiles read" on public.wish_profiles for select to authenticated
  using (public.is_traveller());
drop policy if exists "own profile" on public.wish_profiles;
create policy "own profile" on public.wish_profiles for all to authenticated
  using (id = public.current_traveller_id() or public.is_planner())
  with check (id = public.current_traveller_id() or public.is_planner());

drop policy if exists "wishes read" on public.wishes;
create policy "wishes read" on public.wishes for select to authenticated
  using (traveller_id = public.current_traveller_id() or public.wishes_revealed());
drop policy if exists "own wishes" on public.wishes;
create policy "own wishes" on public.wishes for all to authenticated
  using (traveller_id = public.current_traveller_id() or public.is_planner())
  with check (traveller_id = public.current_traveller_id() or public.is_planner());

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.wish_profiles, public.wishes;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

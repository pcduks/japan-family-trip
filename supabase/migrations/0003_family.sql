-- Family features: couples, quick notes, packing lists, shared expenses and
-- the food tracker. Everyone on the trip reads everything; people write their
-- own rows, and the planner can fix anything.

alter table public.travellers add column if not exists couple text;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  date date,
  place_slug text,
  text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  text text not null,
  category text not null default 'geral',
  checked boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- Amounts in yen; split between couples (empty = all couples equally).
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  paid_by uuid not null references public.travellers (id) on delete cascade,
  amount_jpy int not null check (amount_jpy > 0),
  description text not null default '',
  date date,
  split_couples text[] not null default '{}',
  created_by uuid references public.travellers (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One row per traveller and place: want to go / been, with a 1–5 rating.
create table if not exists public.food_marks (
  id text primary key,
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  place_slug text not null,
  status text not null default 'want' check (status in ('want', 'been')),
  rating int check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  unique (traveller_id, place_slug)
);

alter table public.notes enable row level security;
alter table public.packing_items enable row level security;
alter table public.expenses enable row level security;
alter table public.food_marks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['notes','packing_items','expenses','food_marks'] loop
    execute format('drop policy if exists "travellers read" on public.%I', t);
    execute format('create policy "travellers read" on public.%I for select to authenticated using (public.is_traveller())', t);
  end loop;
  foreach t in array array['notes','packing_items','food_marks'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all to authenticated using (traveller_id = public.current_traveller_id() or public.is_planner()) with check (traveller_id = public.current_traveller_id() or public.is_planner())', t);
  end loop;
end
$$;

-- Anyone can log an expense; only its author or the planner can change it.
drop policy if exists "add expenses" on public.expenses;
create policy "add expenses" on public.expenses for insert to authenticated
  with check (public.is_traveller() and (created_by = public.current_traveller_id() or public.is_planner()));
drop policy if exists "own expenses" on public.expenses;
create policy "own expenses" on public.expenses for update to authenticated
  using (created_by = public.current_traveller_id() or public.is_planner())
  with check (created_by = public.current_traveller_id() or public.is_planner());
drop policy if exists "delete own expenses" on public.expenses;
create policy "delete own expenses" on public.expenses for delete to authenticated
  using (created_by = public.current_traveller_id() or public.is_planner());

-- The family can add restaurants to the shared food list (kind = 'food' only).
drop policy if exists "travellers add food" on public.places;
create policy "travellers add food" on public.places for insert to authenticated
  with check (public.is_traveller() and kind = 'food');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notes, public.packing_items, public.expenses, public.food_marks;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

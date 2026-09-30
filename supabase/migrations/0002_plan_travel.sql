-- Phase 2 and 3: editable plans, day planner, bookings, tips, settings, documents.
-- Replaces the placeholder days/activities/bookings tables from 0001 (they held no data).

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'activities' and column_name = 'day_id') then
    drop table public.activities cascade;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'bookings' and column_name = 'stay_id' and data_type = 'uuid') then
    drop table public.bookings cascade;
  end if;
end
$$;
drop table if exists public.days cascade;

-- Who may see the private documents bucket (the owner and partner).
alter table public.travellers add column if not exists docs_access boolean not null default false;

-- An editable itinerary. Stays are an ordered JSON array; dates are derived
-- from the trip start and each stay's nights, so they are always continuous.
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6b5b95',
  based_on text,
  stays jsonb not null default '[]'::jsonb,
  is_chosen boolean not null default false,
  created_by uuid references public.travellers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists plans_one_chosen on public.plans (is_chosen) where is_chosen;

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans (id) on delete cascade,
  date date not null,
  time text,
  title text not null,
  place_slug text,
  query text,
  note text,
  split_group text,
  who uuid[] not null default '{}',
  sort int not null default 0,
  created_by uuid references public.travellers (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists activities_plan_date on public.activities (plan_id, date);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.plans (id) on delete cascade,
  stay_id text,
  kind text not null default 'lodging' check (kind in ('lodging', 'transport', 'activity', 'other')),
  name text not null,
  url text,
  price_jpy int check (price_jpy is null or price_jpy >= 0),
  people int not null default 6 check (people > 0),
  date date,
  cancel_by date,
  status text not null default 'idea' check (status in ('idea', 'held', 'booked', 'paid')),
  confirmation text,
  address text,
  address_ja text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Food and travel tips pasted from Instagram, friends, articles.
create table if not exists public.tips (
  id uuid primary key default gen_random_uuid(),
  place_slug text,
  url text,
  text text not null default '',
  source text,
  created_by uuid references public.travellers (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Small key/value settings such as the SGD rate.
create table if not exists public.settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.has_docs_access()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.travellers
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and docs_access
  )
$$;

alter table public.plans enable row level security;
alter table public.activities enable row level security;
alter table public.bookings enable row level security;
alter table public.tips enable row level security;
alter table public.settings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['plans','activities','bookings','tips','settings'] loop
    execute format('drop policy if exists "travellers read" on public.%I', t);
    execute format('create policy "travellers read" on public.%I for select to authenticated using (public.is_traveller())', t);
  end loop;
  -- The planner owns the itinerary, bookings and settings.
  foreach t in array array['plans','bookings','settings'] loop
    execute format('drop policy if exists "planner writes" on public.%I', t);
    execute format('create policy "planner writes" on public.%I for all to authenticated using (public.is_planner()) with check (public.is_planner())', t);
  end loop;
  -- Everyone can add to the day plans and the tips inbox.
  foreach t in array array['activities','tips'] loop
    execute format('drop policy if exists "travellers write" on public.%I', t);
    execute format('create policy "travellers write" on public.%I for all to authenticated using (public.is_traveller()) with check (public.is_traveller())', t);
  end loop;
end
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.plans, public.activities, public.bookings, public.tips, public.settings;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

-- Private bucket for fit-to-fly letter, insurance and passports (P3.3).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents read" on storage.objects;
create policy "documents read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.has_docs_access());
drop policy if exists "documents write" on storage.objects;
create policy "documents write" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.has_docs_access());
drop policy if exists "documents delete" on storage.objects;
create policy "documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.has_docs_access());

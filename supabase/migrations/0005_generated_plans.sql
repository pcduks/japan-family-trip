-- Routes built from the family's wishes are plans; the family votes on plans.

alter table public.plans add column if not exists source text not null default 'manual' check (source in ('manual', 'generated'));
alter table public.plans add column if not exists generated jsonb;        -- rationale, coverage, numbers, deadlines, placements
alter table public.plans add column if not exists is_candidate boolean not null default false;

-- Same shape as votes, pointing at candidate plans instead of the original routes.
create table if not exists public.plan_votes (
  traveller_id uuid not null references public.travellers (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete cascade,
  rank int not null check (rank between 1 and 4),
  created_at timestamptz not null default now(),
  primary key (traveller_id, plan_id)
);
alter table public.plan_votes enable row level security;
drop policy if exists "travellers read" on public.plan_votes;
create policy "travellers read" on public.plan_votes for select to authenticated using (public.is_traveller());
drop policy if exists "own votes" on public.plan_votes;
create policy "own votes" on public.plan_votes for all to authenticated
  using (traveller_id = public.current_traveller_id()) with check (traveller_id = public.current_traveller_id());

create or replace function public.submit_plan_ranking(plan_ids uuid[])
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
  delete from public.plan_votes where traveller_id = me;
  for i in 1 .. coalesce(array_length(plan_ids, 1), 0) loop
    insert into public.plan_votes (traveller_id, plan_id, rank)
    select me, p.id, i from public.plans p where p.id = plan_ids[i] and p.is_candidate;
  end loop;
end
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.plan_votes;
    exception when duplicate_object then null;
    end;
  end if;
end
$$;

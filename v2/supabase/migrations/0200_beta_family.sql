-- Beta access: one family code, then "who are you?". No email sign-in.
-- Travellers no longer need an email; the seven slots exist from the start
-- with placeholder names that each person replaces on first visit.

alter table trip.travellers alter column email drop not null;

insert into trip.travellers (id, name, email, role, notes) values
  ('pedro', 'Pedro', null, 'planner', null),
  ('wife', 'Pedro’s wife', null, 'planner', '29 weeks pregnant at departure, about 32 at return'),
  ('brother', 'Brother', null, 'member', null),
  ('sister_in_law', 'Sister-in-law', null, 'member', null),
  ('father', 'Dad', null, 'member', null),
  ('mother', 'Mum', null, 'member', null),
  ('sister', 'Sister', null, 'member', 'May join; room sharing undecided')
on conflict (id) do nothing;

-- Challenge rankings must follow the scoring rule chosen by the creator.
-- VEXRA does not infer whether a high or low value represents a better result.
alter table public.challenges
  add column result_order text not null default 'highest'
  check (result_order in ('highest','lowest'));

-- Keep an append-only record of moderator review outcomes without copying
-- private message text or report narratives into the audit stream.
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid references auth.users(id) on delete set null,
  subject_type text not null check (subject_type in ('report','media')),
  subject_id uuid not null,
  action text not null check (char_length(action) between 1 and 80),
  previous_state jsonb not null default '{}'::jsonb,
  new_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index moderation_actions_by_subject on public.moderation_actions(subject_type,subject_id,created_at desc);
alter table public.moderation_actions enable row level security;
create policy "only moderators read moderation audit" on public.moderation_actions for select to authenticated
  using (public.is_vexra_moderator());
grant select on public.moderation_actions to authenticated;

create or replace function public.audit_moderation_change()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_table_name='moderation_reports' and new.status is distinct from old.status then
    insert into public.moderation_actions(moderator_id,subject_type,subject_id,action,previous_state,new_state)
    values(auth.uid(),'report',new.id,'report_status_changed',jsonb_build_object('status',old.status),
      jsonb_build_object('status',new.status,'resolved_by',new.resolved_by,'resolved_at',new.resolved_at));
  elsif tg_table_name='media_items' and new.review_state is distinct from old.review_state then
    insert into public.moderation_actions(moderator_id,subject_type,subject_id,action,previous_state,new_state)
    values(auth.uid(),'media',new.id,'media_review_state_changed',jsonb_build_object('review_state',old.review_state),
      jsonb_build_object('review_state',new.review_state,'visibility',new.visibility));
  end if;
  return new;
end;
$$;
create trigger audit_report_review after update of status on public.moderation_reports
  for each row execute function public.audit_moderation_change();
create trigger audit_media_review after update of review_state on public.media_items
  for each row execute function public.audit_moderation_change();

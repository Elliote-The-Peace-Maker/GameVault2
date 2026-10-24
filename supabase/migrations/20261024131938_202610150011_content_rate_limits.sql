begin;

-- Keep one small counter per player and action type. No client role can read or
-- change these counters; the trigger function below is the only writer.
create table public.user_action_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_key text not null check (action_key in (
    'post','comment','message','report','stream_link','media_submission',
    'community_invitation','community_join_request','community_creation'
  )),
  window_started_at timestamptz not null default now(),
  action_count integer not null default 0 check (action_count >= 0),
  primary key (user_id, action_key)
);
alter table public.user_action_limits enable row level security;
revoke all on table public.user_action_limits from public, anon, authenticated;

create or replace function public.enforce_user_action_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user uuid;
  action_name text := tg_argv[1];
  action_limit integer := tg_argv[2]::integer;
  window_seconds integer := tg_argv[3]::integer;
  limit_message text := tg_argv[4];
  current_count integer;
  quota_window interval;
begin
  target_user := nullif(to_jsonb(new)->>tg_argv[0], '')::uuid;
  if target_user is null or action_limit < 1 or window_seconds < 1 then
    raise exception 'Invalid VEXRA rate limit configuration' using errcode='22023';
  end if;
  quota_window := make_interval(secs => window_seconds);

  -- The unique-key upsert serializes concurrent requests for this player and
  -- action, so parallel calls cannot race past the quota.
  insert into public.user_action_limits as current_limit
    (user_id, action_key, window_started_at, action_count)
  values (target_user, action_name, now(), 1)
  on conflict (user_id, action_key) do update
    set window_started_at = case
          when current_limit.window_started_at <= now() - quota_window then now()
          else current_limit.window_started_at
        end,
        action_count = case
          when current_limit.window_started_at <= now() - quota_window then 1
          else current_limit.action_count + 1
        end
  returning action_count into current_count;

  if current_count > action_limit then
    raise exception '%', limit_message using errcode='P0001';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_user_action_rate_limit() from public, anon, authenticated;

create or replace function public.can_upload_vexra_object(target_bucket text, target_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage, pg_temp
as $$
declare
  hourly_limit integer;
  recent_uploads bigint;
begin
  -- Expose only the caller's own quota state to storage policy checks.
  if auth.uid() is null or target_user is distinct from auth.uid() then return false; end if;
  if target_bucket='vexra-avatars' then hourly_limit := 5;
  elsif target_bucket='vexra-media' then hourly_limit := 10;
  else return false;
  end if;

  select count(*) into recent_uploads
  from storage.objects o
  where o.bucket_id=target_bucket
    and (storage.foldername(o.name))[1]=target_user::text
    and o.created_at > now() - interval '1 hour';
  return recent_uploads < hourly_limit;
end;
$$;
revoke all on function public.can_upload_vexra_object(text,uuid) from public, anon, authenticated;
grant execute on function public.can_upload_vexra_object(text,uuid) to authenticated;

alter policy "upload own avatar" on storage.objects to authenticated
  with check (bucket_id='vexra-avatars' and (storage.foldername(name))[1]=auth.uid()::text
    and public.can_upload_vexra_object(bucket_id,auth.uid()));
alter policy "upload own media files" on storage.objects to authenticated
  with check (bucket_id='vexra-media' and (storage.foldername(name))[1]=auth.uid()::text
    and public.can_upload_vexra_object(bucket_id,auth.uid()));
create trigger rate_limit_posts before insert on public.posts
  for each row execute function public.enforce_user_action_rate_limit('author_id','post',5,600,'You have posted several times recently. Wait a few minutes, then try again.');
create trigger rate_limit_comments before insert on public.comments
  for each row execute function public.enforce_user_action_rate_limit('author_id','comment',30,600,'You have replied frequently. Wait a few minutes, then try again.');
create trigger rate_limit_messages before insert on public.messages
  for each row execute function public.enforce_user_action_rate_limit('sender_id','message',60,600,'You have sent many messages recently. Wait a few minutes, then try again.');
create trigger rate_limit_reports before insert on public.moderation_reports
  for each row execute function public.enforce_user_action_rate_limit('reporter_id','report',10,3600,'You have submitted several reports recently. Try again later.');
create trigger rate_limit_stream_links before insert on public.stream_links
  for each row execute function public.enforce_user_action_rate_limit('user_id','stream_link',6,3600,'You have added several stream links recently. Try again later.');
create trigger rate_limit_media_submissions before insert on public.media_items
  for each row execute function public.enforce_user_action_rate_limit('owner_id','media_submission',10,3600,'You have submitted several media items recently. Try again later.');
create trigger rate_limit_community_invitations before insert on public.community_invitations
  for each row execute function public.enforce_user_action_rate_limit('inviter_id','community_invitation',20,3600,'You have sent several community invitations recently. Try again later.');
create trigger rate_limit_community_join_requests before insert on public.community_join_requests
  for each row execute function public.enforce_user_action_rate_limit('requester_id','community_join_request',8,3600,'You have sent several community join requests recently. Try again later.');
create trigger rate_limit_community_creation before insert on public.communities
  for each row execute function public.enforce_user_action_rate_limit('owner_id','community_creation',4,86400,'You have created several communities today. Try again tomorrow.');

commit;

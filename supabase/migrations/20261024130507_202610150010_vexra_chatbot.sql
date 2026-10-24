begin;

create table if not exists public.vexra_chat_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0)
);

alter table public.vexra_chat_usage enable row level security;
revoke all on table public.vexra_chat_usage from public, anon, authenticated;
grant all on table public.vexra_chat_usage to service_role;

create or replace function public.consume_vexra_chat_message(target_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requests_in_window integer;
begin
  if target_user is null then
    return false;
  end if;

  insert into public.vexra_chat_usage as usage (user_id, window_started_at, request_count)
  values (target_user, now(), 1)
  on conflict (user_id) do update
    set window_started_at = case
          when usage.window_started_at <= now() - interval '1 hour' then now()
          else usage.window_started_at
        end,
        request_count = case
          when usage.window_started_at <= now() - interval '1 hour' then 1
          else usage.request_count + 1
        end
  returning request_count into requests_in_window;

  return requests_in_window <= 20;
end;
$$;

revoke all on function public.consume_vexra_chat_message(uuid) from public, anon, authenticated;
grant execute on function public.consume_vexra_chat_message(uuid) to service_role;

commit;

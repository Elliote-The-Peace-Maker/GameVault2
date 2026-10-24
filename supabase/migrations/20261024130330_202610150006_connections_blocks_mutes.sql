-- Mutual connections are separate from follows (no follow table is in the
-- current VEXRA plan). Requests are directional; cooldowns use the direction
-- that was declined, so the reverse direction remains the documented exception.
create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id,blocked_id),
  check (blocker_id<>blocked_id)
);
create table public.user_mutes (
  muter_id uuid not null references auth.users(id) on delete cascade,
  muted_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id,muted_id),
  check (muter_id<>muted_id)
);
create table public.connections (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  connected_at timestamptz not null default now(),
  primary key (user_low,user_high),
  check (user_low<user_high)
);
create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  -- A global sequence records decline order even when timestamps are identical.
  decline_sequence bigint unique,
  check (sender_id<>recipient_id),
  check ((status='pending' and responded_at is null and decline_sequence is null)
    or (status<>'pending' and responded_at is not null)),
  check ((status='declined')=(decline_sequence is not null))
);
create unique index one_pending_connection_request_per_pair
  on public.connection_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id))
  where status='pending';
create index connection_requests_by_recipient on public.connection_requests(recipient_id,status,created_at desc);
create index connections_by_high on public.connections(user_high,user_low);
create sequence public.connection_decline_sequence;

alter table public.user_blocks enable row level security;
alter table public.user_mutes enable row level security;
alter table public.connections enable row level security;
alter table public.connection_requests enable row level security;

create policy "users manage their own blocks" on public.user_blocks for all to authenticated
  using (blocker_id=auth.uid()) with check (blocker_id=auth.uid());
create policy "users manage their own mutes" on public.user_mutes for all to authenticated
  using (muter_id=auth.uid()) with check (muter_id=auth.uid());
create policy "connection participants read" on public.connections for select to authenticated
  using (auth.uid() in (user_low,user_high));
create policy "request participants read" on public.connection_requests for select to authenticated
  using (sender_id=auth.uid() or recipient_id=auth.uid());
grant select,insert,delete on public.user_blocks,public.user_mutes to authenticated;
grant select on public.connections,public.connection_requests to authenticated;

create or replace function public.is_blocked_for_current_user(target_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and exists(
    select 1 from public.user_blocks b
    where (b.blocker_id=auth.uid() and b.blocked_id=target_user)
       or (b.blocker_id=target_user and b.blocked_id=auth.uid())
  );
$$;
create or replace function public.is_muted_by_current_user(target_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and exists(
    select 1 from public.user_mutes m where m.muter_id=auth.uid() and m.muted_id=target_user
  );
$$;
revoke all on function public.is_blocked_for_current_user(uuid) from public;
revoke all on function public.is_muted_by_current_user(uuid) from public;
grant execute on function public.is_blocked_for_current_user(uuid) to anon,authenticated;
grant execute on function public.is_muted_by_current_user(uuid) to anon,authenticated;

create or replace function public.send_connection_request(target_user uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare request_id uuid; recent_decline timestamptz;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if target_user is null or target_user=auth.uid() then raise exception 'Choose another VEXRA player'; end if;
  if not public.is_public_vexra_profile(target_user) then raise exception 'That player is private or unavailable'; end if;
  if public.is_blocked_for_current_user(target_user) then raise exception 'This connection is unavailable'; end if;
  if exists(select 1 from public.connections c where c.user_low=least(auth.uid(),target_user) and c.user_high=greatest(auth.uid(),target_user)) then
    raise exception 'You are already connected';
  end if;
  -- Directional 30-day cooldown. A prior decline in the reverse direction
  -- does not match this query and therefore remains the reverse-request exception.
  select r.responded_at into recent_decline
  from public.connection_requests r
  where r.sender_id=auth.uid() and r.recipient_id=target_user and r.status='declined'
  order by r.decline_sequence desc limit 1;
  if recent_decline is not null and now()<recent_decline+interval '30 days' then
    raise exception 'You can send another request to this player after the 30-day cooldown';
  end if;
  if exists(select 1 from public.connection_requests r where r.status='pending'
    and least(r.sender_id,r.recipient_id)=least(auth.uid(),target_user)
    and greatest(r.sender_id,r.recipient_id)=greatest(auth.uid(),target_user)) then
    raise exception 'This player already sent you a request. Respond to their request instead';
  end if;
  insert into public.connection_requests(sender_id,recipient_id)
  values(auth.uid(),target_user) returning id into request_id;
  return request_id;
end;
$$;
revoke all on function public.send_connection_request(uuid) from public,anon;
grant execute on function public.send_connection_request(uuid) to authenticated;

create or replace function public.respond_to_connection_request(request_id uuid,accept_request boolean)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.connection_requests%rowtype; recipient_name text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into request_row from public.connection_requests r
  where r.id=request_id and r.recipient_id=auth.uid() and r.status='pending' for update;
  if not found then raise exception 'Pending request not found'; end if;
  if accept_request and public.is_blocked_for_current_user(request_row.sender_id) then
    raise exception 'This request cannot be accepted';
  end if;
  if accept_request then
    insert into public.connections(user_low,user_high)
    values(least(request_row.sender_id,request_row.recipient_id),greatest(request_row.sender_id,request_row.recipient_id))
    on conflict do nothing;
    update public.connection_requests set status='accepted',responded_at=now() where id=request_id;
    select display_name into recipient_name from public.profiles where id=auth.uid();
    insert into public.notifications(user_id,kind,title,body,href)
    values(request_row.sender_id,'connection_request','Connection request accepted',coalesce(recipient_name,'A VEXRA player')||' accepted your request.','/pages/profile.html?username='||(select username from public.profiles where id=auth.uid()));
    return 'accepted';
  end if;
  update public.connection_requests set status='declined',responded_at=now(),decline_sequence=nextval('public.connection_decline_sequence') where id=request_id;
  insert into public.notifications(user_id,kind,title,body,href)
  values(request_row.sender_id,'connection_request','Connection request declined','Your connection request was declined.','/pages/notifications.html');
  return 'declined';
end;
$$;
revoke all on function public.respond_to_connection_request(uuid,boolean) from public,anon;
grant execute on function public.respond_to_connection_request(uuid,boolean) to authenticated;

create or replace function public.notify_connection_request()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare sender_name text;
begin
  select display_name into sender_name from public.profiles where id=new.sender_id;
  insert into public.notifications(user_id,kind,title,body,href)
  values(new.recipient_id,'connection_request','New connection request',coalesce(sender_name,'A VEXRA player')||' wants to connect with you.','/pages/notifications.html?connection_request='||new.id);
  return new;
end;
$$;
create trigger connection_request_notification after insert on public.connection_requests for each row execute function public.notify_connection_request();

alter table public.profile_privacy
  alter column field_visibility set default '{"avatar":true,"bio":true,"games":false,"achievements":false,"platforms":false,"socials":false,"connections":false}'::jsonb;
update public.profile_privacy set field_visibility=field_visibility||'{"connections":false}'::jsonb where not (field_visibility ? 'connections');

create or replace view public.profile_cards with (security_barrier=true) as
select p.id,p.username,p.display_name,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'avatar')::boolean,true) then p.avatar_url else null end as avatar_url,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'bio')::boolean,false) then p.bio else null end as bio,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'games')::boolean,false)) as show_games,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'platforms')::boolean,false)) as show_platforms,
  p.created_at,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'socials')::boolean,false) then p.social_links else '{}'::jsonb end as social_links,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'socials')::boolean,false)) as show_socials,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'connections')::boolean,false)) as show_connections
from public.profiles p join public.profile_privacy pp on pp.user_id=p.id
where (pp.visibility='public' or p.id=auth.uid()) and not public.is_blocked_for_current_user(p.id);

create or replace view public.public_profile_games with (security_barrier=true) as
select ug.user_id,g.slug,g.title,g.genre,ug.is_favorite,ug.is_currently_playing
from public.user_games ug join public.games g on g.id=ug.game_id
join public.profile_privacy pp on pp.user_id=ug.user_id
where ((pp.visibility='public' and coalesce((pp.field_visibility->>'games')::boolean,false)) or ug.user_id=auth.uid())
  and not public.is_blocked_for_current_user(ug.user_id);
create or replace view public.public_profile_platforms with (security_barrier=true) as
select up.user_id,p.slug,p.name from public.user_platforms up join public.platforms p on p.id=up.platform_id
join public.profile_privacy pp on pp.user_id=up.user_id
where ((pp.visibility='public' and coalesce((pp.field_visibility->>'platforms')::boolean,false)) or up.user_id=auth.uid())
  and not public.is_blocked_for_current_user(up.user_id);
create or replace view public.public_profile_achievements with (security_barrier=true) as
select a.user_id,a.title,a.description,a.awarded_at from public.user_achievements a join public.profile_privacy pp on pp.user_id=a.user_id
where ((pp.visibility='public' and coalesce((pp.field_visibility->>'achievements')::boolean,false)) or a.user_id=auth.uid())
  and not public.is_blocked_for_current_user(a.user_id);
create view public.public_profile_connections with (security_barrier=true) as
with endpoints as (
  select user_low as user_id,user_high as connected_user_id from public.connections
  union all select user_high,user_low from public.connections
)
select e.user_id,e.connected_user_id,p.username,p.display_name
from endpoints e join public.profile_privacy pp on pp.user_id=e.user_id
join public.profile_cards p on p.id=e.connected_user_id
where (e.user_id=auth.uid() or (pp.visibility='public' and coalesce((pp.field_visibility->>'connections')::boolean,false)))
  and not public.is_blocked_for_current_user(e.connected_user_id);
grant select on public.public_profile_connections to anon,authenticated;

drop policy "posts visible with community" on public.posts;
create policy "posts visible with community and relationship checks" on public.posts for select to anon,authenticated
  using (public.can_view_community(community_id) and not public.is_blocked_for_current_user(author_id) and not public.is_muted_by_current_user(author_id));
drop policy "comments visible with post" on public.comments;
create policy "comments visible with post and relationship checks" on public.comments for select to anon,authenticated
  using (exists(select 1 from public.posts p where p.id=comments.post_id and public.can_view_community(p.community_id))
    and not public.is_blocked_for_current_user(author_id) and not public.is_muted_by_current_user(author_id));
drop policy "reactions visible with post" on public.post_reactions;
create policy "reactions visible with post and relationship checks" on public.post_reactions for select to anon,authenticated
  using (exists(select 1 from public.posts p where p.id=post_reactions.post_id and public.can_view_community(p.community_id))
    and not public.is_blocked_for_current_user(user_id) and not public.is_muted_by_current_user(user_id));
drop policy "approved media or owner readable" on public.media_items;
create policy "approved media or owner readable with block checks" on public.media_items for select to anon,authenticated
  using (((review_state='approved' and visibility='public') or owner_id=auth.uid() or public.is_vexra_moderator()) and not public.is_blocked_for_current_user(owner_id));
drop policy "public streams readable" on public.stream_links;
create policy "public streams readable with block checks" on public.stream_links for select to anon,authenticated
  using ((is_public or user_id=auth.uid() or public.is_vexra_moderator()) and not public.is_blocked_for_current_user(user_id));

create or replace function public.can_access_conversation(target_conversation uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.conversation_members mine join public.conversation_members other on other.conversation_id=mine.conversation_id
    where mine.conversation_id=target_conversation and mine.user_id=auth.uid() and other.user_id<>auth.uid()
      and not public.is_blocked_for_current_user(other.user_id));
$$;
revoke all on function public.can_access_conversation(uuid) from public,anon;
grant execute on function public.can_access_conversation(uuid) to authenticated;
drop policy "conversation participants read" on public.conversations;
create policy "conversation participants read with block checks" on public.conversations for select to authenticated using (public.can_access_conversation(id));
drop policy "conversation members readable to participants" on public.conversation_members;
create policy "conversation members readable with block checks" on public.conversation_members for select to authenticated using (public.can_access_conversation(conversation_id));
drop policy "message participants read" on public.messages;
create policy "message participants read with block checks" on public.messages for select to authenticated using (public.can_access_conversation(conversation_id));
drop policy "participants send own messages" on public.messages;
create policy "participants send own messages without blocks" on public.messages for insert to authenticated
  with check (sender_id=auth.uid() and public.can_access_conversation(conversation_id));

create or replace function public.start_direct_conversation(target_user uuid)
returns uuid language plpgsql security definer set search_path=public, pg_temp as $$
declare conversation_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if target_user=auth.uid() then raise exception 'Choose another player'; end if;
  if public.is_blocked_for_current_user(target_user) then raise exception 'This conversation is unavailable'; end if;
  if not exists(select 1 from public.profile_privacy pp where pp.user_id=target_user and pp.visibility='public') then raise exception 'The player is private or unavailable'; end if;
  insert into public.conversations(created_by) values(auth.uid()) returning id into conversation_id;
  insert into public.conversation_members(conversation_id,user_id) values(conversation_id,auth.uid()),(conversation_id,target_user);
  return conversation_id;
end;
$$;
revoke all on function public.start_direct_conversation(uuid) from public,anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

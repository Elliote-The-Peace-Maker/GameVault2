-- Listing visibility and membership access are separate choices. Invite-only
-- communities remain private; approval-based communities require a steward.
alter table public.communities
  add column membership_mode text not null default 'open'
  check (membership_mode in ('open','approval','invite_only'));

create table public.community_join_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check ((status='pending' and responded_at is null) or (status<>'pending' and responded_at is not null))
);
create unique index one_pending_community_join_request
  on public.community_join_requests(community_id,requester_id) where status='pending';
create index community_join_requests_by_community on public.community_join_requests(community_id,status,created_at);
alter table public.community_join_requests enable row level security;

create or replace function public.can_manage_community(target_community uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and (
    exists(select 1 from public.communities c where c.id=target_community and c.owner_id=auth.uid())
    or public.is_vexra_moderator()
    or exists(select 1 from public.community_members m where m.community_id=target_community and m.user_id=auth.uid() and m.role in ('owner','moderator'))
  );
$$;
revoke all on function public.can_manage_community(uuid) from public;
grant execute on function public.can_manage_community(uuid) to anon,authenticated;

create policy "requester or community stewards read join requests" on public.community_join_requests for select to authenticated
  using (requester_id=auth.uid() or public.can_manage_community(community_id));
create policy "players request approval to join public approval communities" on public.community_join_requests for insert to authenticated
  with check (requester_id=auth.uid() and exists(select 1 from public.communities c
    where c.id=community_id and c.visibility='public' and c.membership_mode='approval')
    and not exists(select 1 from public.community_members m where m.community_id=community_id and m.user_id=auth.uid()));
grant select,insert on public.community_join_requests to authenticated;

drop policy "members may join public communities" on public.community_members;
create policy "members join open public communities" on public.community_members for insert to authenticated
  with check (user_id=auth.uid() and role='member' and exists(select 1 from public.communities c
    where c.id=community_id and c.visibility='public' and c.membership_mode='open'));
drop policy "members may leave or owner may manage" on public.community_members;
create policy "members leave and stewards manage membership" on public.community_members for delete to authenticated
  using ((user_id=auth.uid() and not exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()))
    or public.can_manage_community(community_id));

drop policy "community owner manages" on public.communities;
create policy "community stewards manage" on public.communities for update to authenticated
  using (public.can_manage_community(id)) with check (public.can_manage_community(id));

create or replace function public.guard_community_owner()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.owner_id is distinct from old.owner_id and not public.is_vexra_moderator() then
    raise exception 'Only a VEXRA administrator can transfer community ownership';
  end if;
  return new;
end;
$$;
create trigger communities_owner_guard before update of owner_id on public.communities
  for each row execute function public.guard_community_owner();

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('connection_request','reply','mention','community_invitation','community_join_request','moderation','message','system'));

create or replace function public.notify_community_join_request()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare community_name text; community_slug text; owner_user uuid;
begin
  select c.name,c.slug,c.owner_id into community_name,community_slug,owner_user from public.communities c where c.id=new.community_id;
  insert into public.notifications(user_id,kind,title,body,href)
  values(owner_user,'community_join_request','Community join request','A player requested to join '||community_name||'.','/pages/community.html?slug='||community_slug);
  return new;
end;
$$;
create trigger community_join_request_notification after insert on public.community_join_requests
  for each row execute function public.notify_community_join_request();

create or replace function public.respond_to_community_join_request(request_id uuid,approve_join boolean)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare request_row public.community_join_requests%rowtype; community_slug text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select * into request_row from public.community_join_requests r
  where r.id=request_id and r.status='pending' for update;
  if not found then raise exception 'Pending join request not found'; end if;
  if not public.can_manage_community(request_row.community_id) then raise exception 'Community steward permissions required'; end if;
  select slug into community_slug from public.communities where id=request_row.community_id;
  update public.community_join_requests set status=case when approve_join then 'approved' else 'declined' end,responded_at=now() where id=request_id;
  if approve_join then
    insert into public.community_members(community_id,user_id,role) values(request_row.community_id,request_row.requester_id,'member') on conflict do nothing;
  end if;
  insert into public.notifications(user_id,kind,title,body,href)
  values(request_row.requester_id,'community_join_request',case when approve_join then 'Join request approved' else 'Join request declined' end,
    case when approve_join then 'Your community join request was approved.' else 'Your community join request was declined.' end,
    '/pages/community.html?slug='||community_slug);
  return case when approve_join then 'approved' else 'declined' end;
end;
$$;
revoke all on function public.respond_to_community_join_request(uuid,boolean) from public,anon;
grant execute on function public.respond_to_community_join_request(uuid,boolean) to authenticated;

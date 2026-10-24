-- Invitation notifications are separate from friend/connection requests.
-- Connection-request ordering/cooldown rules were not supplied, so they are
-- deliberately not implemented by this migration.
create table public.community_invitations (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (inviter_id <> invitee_id)
);
create unique index one_pending_community_invite on public.community_invitations(community_id,invitee_id) where status='pending';
create index community_invites_by_recipient on public.community_invitations(invitee_id,status,created_at desc);
alter table public.community_invitations enable row level security;

create or replace function public.is_public_vexra_profile(target_user uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.profile_privacy pp where pp.user_id=target_user and pp.visibility='public');
$$;

create policy "participants read their invitations" on public.community_invitations for select to authenticated
  using (inviter_id=auth.uid() or invitee_id=auth.uid() or public.is_vexra_moderator());
create policy "community stewards invite public profiles" on public.community_invitations for insert to authenticated
  with check (inviter_id=auth.uid() and exists(select 1 from public.community_members m where m.community_id=community_invitations.community_id and m.user_id=auth.uid() and m.role in ('owner','moderator')) and public.is_public_vexra_profile(community_invitations.invitee_id));
grant select,insert on public.community_invitations to authenticated;

create policy "invitees can preview their private invitation" on public.communities for select to authenticated
  using (exists(select 1 from public.community_invitations i where i.community_id=communities.id and i.invitee_id=auth.uid() and i.status='pending'));

create or replace function public.respond_to_community_invitation(invitation_id uuid, accept_invitation boolean)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare target_community uuid; target_slug text; invitation_status text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select i.community_id,i.status,c.slug into target_community,invitation_status,target_slug
  from public.community_invitations i join public.communities c on c.id=i.community_id
  where i.id=invitation_id and i.invitee_id=auth.uid() for update;
  if target_community is null then raise exception 'Invitation not found'; end if;
  if invitation_status<>'pending' then raise exception 'Invitation has already been answered'; end if;
  update public.community_invitations set status=case when accept_invitation then 'accepted' else 'declined' end, responded_at=now() where id=invitation_id;
  if accept_invitation then
    insert into public.community_members(community_id,user_id,role) values(target_community,auth.uid(),'member') on conflict do nothing;
  end if;
  return target_slug;
end;
$$;
revoke all on function public.respond_to_community_invitation(uuid,boolean) from public,anon;
grant execute on function public.respond_to_community_invitation(uuid,boolean) to authenticated;

create or replace function public.notify_community_invitation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare community_title text; community_slug text; inviter_name text;
begin
  select c.name,c.slug,p.display_name into community_title,community_slug,inviter_name
  from public.communities c join public.profiles p on p.id=new.inviter_id where c.id=new.community_id;
  insert into public.notifications(user_id,kind,title,body,href)
  values(new.invitee_id,'community_invitation','Community invitation',coalesce(inviter_name,'A VEXRA member')||' invited you to '||coalesce(community_title,'a community'),'/pages/community.html?slug='||community_slug);
  return new;
end;
$$;
create trigger new_community_invitation after insert on public.community_invitations for each row execute function public.notify_community_invitation();

create or replace function public.notify_moderation_reporter()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status is distinct from old.status and new.status<>'pending' then
    insert into public.notifications(user_id,kind,title,body,href)
    values(new.reporter_id,'moderation','Report update','A VEXRA moderator updated the status of your report.','/pages/notifications.html');
  end if;
  return new;
end;
$$;
create trigger moderation_report_notification after update of status on public.moderation_reports for each row execute function public.notify_moderation_reporter();

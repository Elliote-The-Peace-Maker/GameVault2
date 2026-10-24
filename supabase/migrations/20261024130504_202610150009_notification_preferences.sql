-- Apply account-level notification preferences to every database-generated
-- in-app notification. Missing/invalid preference keys default to enabled so
-- new notification types remain visible until a user chooses otherwise.
alter table public.account_preferences
  alter column notification_preferences set default '{"replies":true,"mentions":true,"connections":true,"community_invites":true,"community_join_requests":true,"moderation":true,"messages":true}'::jsonb;

update public.account_preferences
set notification_preferences=notification_preferences||'{"community_join_requests":true}'::jsonb
where not (notification_preferences ? 'community_join_requests');

create or replace function public.notification_preference_enabled(target_user uuid, preference_key text)
returns boolean
language plpgsql stable security definer
set search_path=public,pg_temp as $$
declare preferences jsonb;
begin
  select ap.notification_preferences into preferences
  from public.account_preferences ap where ap.user_id=target_user;
  if not found or jsonb_typeof(preferences->preference_key) is distinct from 'boolean' then
    return true;
  end if;
  return (preferences->>preference_key)::boolean;
end;
$$;
revoke all on function public.notification_preference_enabled(uuid,text) from public,anon,authenticated;

create or replace function public.notify_post_reply()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare target_user uuid; community_slug text;
begin
  select p.author_id,c.slug into target_user,community_slug
  from public.posts p join public.communities c on c.id=p.community_id where p.id=new.post_id;
  if target_user is not null and target_user<>new.author_id
     and public.notification_preference_enabled(target_user,'replies') then
    insert into public.notifications(user_id,kind,title,body,href)
    values(target_user,'reply','New reply on your VEXRA post',left(new.body,250),'/pages/community.html?slug='||community_slug);
  end if;
  return new;
end;
$$;

create or replace function public.notify_message_recipients()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.notifications(user_id,kind,title,body,href)
  select m.user_id,'message','New private message','You received a VEXRA message.',
    '/pages/messages.html?conversation='||new.conversation_id::text
  from public.conversation_members m
  where m.conversation_id=new.conversation_id and m.user_id<>new.sender_id
    and public.notification_preference_enabled(m.user_id,'messages');
  return new;
end;
$$;

create or replace function public.notify_community_invitation()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare community_title text; community_slug text; inviter_name text;
begin
  select c.name,c.slug,p.display_name into community_title,community_slug,inviter_name
  from public.communities c join public.profiles p on p.id=new.inviter_id where c.id=new.community_id;
  if public.notification_preference_enabled(new.invitee_id,'community_invites') then
    insert into public.notifications(user_id,kind,title,body,href)
    values(new.invitee_id,'community_invitation','Community invitation',coalesce(inviter_name,'A VEXRA member')||' invited you to '||coalesce(community_title,'a community'),'/pages/community.html?slug='||community_slug);
  end if;
  return new;
end;
$$;

create or replace function public.notify_moderation_reporter()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status is distinct from old.status and new.status<>'pending'
     and public.notification_preference_enabled(new.reporter_id,'moderation') then
    insert into public.notifications(user_id,kind,title,body,href)
    values(new.reporter_id,'moderation','Report update','A VEXRA moderator updated the status of your report.','/pages/notifications.html');
  end if;
  return new;
end;
$$;

create or replace function public.notify_mentions_from_content()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare target_author uuid; target_post uuid; target_community uuid; target_slug text; recipient uuid;
begin
  if tg_table_name='posts' then
    target_author:=new.author_id; target_post:=new.id; target_community:=new.community_id;
  else
    target_author:=new.author_id; target_post:=new.post_id;
    select p.community_id into target_community from public.posts p where p.id=target_post;
  end if;
  select c.slug into target_slug from public.communities c where c.id=target_community;
  for recipient in
    select distinct p.id
    from public.profiles p
    join lateral regexp_matches(new.body,'@([A-Za-z0-9_]{3,24})','g') as matches(parts)
      on lower(p.username)=lower(matches.parts[1])
    join public.communities c on c.id=target_community
    where p.id<>target_author
      and (c.visibility='public' or exists(select 1 from public.community_members cm where cm.community_id=c.id and cm.user_id=p.id))
      and public.notification_preference_enabled(p.id,'mentions')
  loop
    insert into public.notifications(user_id,kind,title,body,href)
    values(recipient,'mention','You were mentioned on VEXRA','A member mentioned you in a community post.','/pages/community.html?slug='||target_slug);
  end loop;
  return new;
end;
$$;

create or replace function public.notify_connection_request()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare sender_name text;
begin
  select display_name into sender_name from public.profiles where id=new.sender_id;
  if public.notification_preference_enabled(new.recipient_id,'connections') then
    insert into public.notifications(user_id,kind,title,body,href)
    values(new.recipient_id,'connection_request','New connection request',coalesce(sender_name,'A VEXRA player')||' wants to connect with you.','/pages/notifications.html?connection_request='||new.id);
  end if;
  return new;
end;
$$;

create or replace function public.notify_community_join_request()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare community_name text; community_slug text; recipient uuid;
begin
  select c.name,c.slug into community_name,community_slug from public.communities c where c.id=new.community_id;
  for recipient in
    select c.owner_id from public.communities c where c.id=new.community_id
    union
    select cm.user_id from public.community_members cm
    where cm.community_id=new.community_id and cm.role='moderator'
  loop
    if public.notification_preference_enabled(recipient,'community_join_requests') then
      insert into public.notifications(user_id,kind,title,body,href)
      values(recipient,'community_join_request','Community join request','A player requested to join '||community_name||'.','/pages/community.html?slug='||community_slug);
    end if;
  end loop;
  return new;
end;
$$;

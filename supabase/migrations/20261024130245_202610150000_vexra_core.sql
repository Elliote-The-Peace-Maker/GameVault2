-- VEXRA core schema. User-facing data uses Supabase Auth IDs and RLS.
create extension if not exists pgcrypto;

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  genre text not null,
  description text not null default '',
  supported_platforms text[] not null default '{}',
  catalog_note text not null default 'Curated directory entry; verify availability with the publisher.',
  cover_path text,
  is_upcoming boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.game_platforms (
  game_id uuid not null references public.games(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete cascade,
  primary key (game_id, platform_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_privacy (
  user_id uuid primary key references auth.users(id) on delete cascade,
  visibility text not null default 'private' check (visibility in ('public','private')),
  field_visibility jsonb not null default '{"avatar":true,"bio":true,"games":false,"achievements":false,"platforms":false}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.user_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  is_favorite boolean not null default false,
  is_currently_playing boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table public.user_platforms (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, platform_id)
);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  rules text[] not null default '{}',
  visibility text not null default 'public' check (visibility in ('public','private')),
  member_count integer not null default 0 check (member_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','moderator','member')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','gg')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.creator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  headline text not null default '' check (char_length(headline) <= 180),
  featured_work_title text not null default '' check (char_length(featured_work_title) <= 120),
  featured_work_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (featured_work_url is null or featured_work_url ~ '^https://')
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 180),
  review_state text not null default 'pending' check (review_state in ('pending','approved','rejected')),
  visibility text not null default 'public' check (visibility in ('public','community','private')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null
);

create table public.stream_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  title text not null default '' check (char_length(title) <= 120),
  url text not null check (url ~ '^https://(www\.)?(twitch\.tv|youtube\.com|youtu\.be|kick\.com)/'),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('connection_request','reply','mention','community_invitation','moderation','message','system')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 600),
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  is_public boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  result_value numeric not null,
  result_label text not null default '' check (char_length(result_label) <= 120),
  is_user_entered boolean not null default true check (is_user_entered),
  submitted_at timestamptz not null default now(),
  unique (challenge_id,user_id)
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  is_user_entered boolean not null default true check (is_user_entered),
  awarded_at timestamptz not null default now()
);

create table public.gaming_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  note text not null default '' check (char_length(note) <= 1000),
  source text not null default 'player-entered' check (source = 'player-entered'),
  is_user_entered boolean not null default true check (is_user_entered),
  occurred_at timestamptz not null default now()
);

create table public.account_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notification_preferences jsonb not null default '{"replies":true,"mentions":true,"connections":true,"community_invites":true,"moderation":true,"messages":true}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator','admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('profile','community','post','comment','media','stream')),
  subject_id uuid not null,
  reason text not null check (char_length(reason) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending','reviewed','actioned','dismissed')),
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz
);

create index user_games_by_game on public.user_games(game_id);
create index communities_by_game on public.communities(game_id,visibility);
create index community_members_by_user on public.community_members(user_id,community_id);
create index posts_by_community_date on public.posts(community_id,created_at desc);
create index comments_by_post_date on public.comments(post_id,created_at);
create index messages_by_conversation_date on public.messages(conversation_id,created_at);
create index notifications_by_user_date on public.notifications(user_id,created_at desc);
create index media_by_review_date on public.media_items(review_state,created_at desc);
create index report_queue on public.moderation_reports(status,created_at);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger privacy_touch before update on public.profile_privacy for each row execute function public.touch_updated_at();
create trigger communities_touch before update on public.communities for each row execute function public.touch_updated_at();
create trigger creators_touch before update on public.creator_profiles for each row execute function public.touch_updated_at();
create trigger preferences_touch before update on public.account_preferences for each row execute function public.touch_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare desired text; shown text;
begin
  desired := lower(coalesce(new.raw_user_meta_data->>'username','player_'||substr(replace(new.id::text,'-',''),1,10)));
  if desired !~ '^[a-z0-9_]{3,24}$' then desired := 'player_'||substr(replace(new.id::text,'-',''),1,10); end if;
  shown := left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''),desired),60);
  insert into public.profiles(id,username,display_name)
  values(new.id,desired,shown)
  on conflict(username) do nothing;
  if not exists(select 1 from public.profiles where id=new.id) then
    insert into public.profiles(id,username,display_name)
    values(new.id,'player_'||substr(replace(new.id::text,'-',''),1,10),shown);
  end if;
  insert into public.profile_privacy(user_id) values(new.id) on conflict do nothing;
  insert into public.account_preferences(user_id) values(new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.is_vexra_moderator()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.user_roles r where r.user_id=auth.uid() and r.role in ('moderator','admin'));
$$;
create or replace function public.is_community_member(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.community_members m where m.community_id=target and m.user_id=auth.uid());
$$;
create or replace function public.can_view_community(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.communities c where c.id=target and (c.visibility='public' or c.owner_id=auth.uid() or public.is_community_member(c.id) or public.is_vexra_moderator()));
$$;
create or replace function public.is_conversation_member(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.conversation_members m where m.conversation_id=target and m.user_id=auth.uid());
$$;

create or replace function public.update_community_count()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op='INSERT' then update public.communities set member_count=member_count+1 where id=new.community_id; return new;
  elsif tg_op='DELETE' then update public.communities set member_count=greatest(member_count-1,0) where id=old.community_id; return old;
  end if;
  return null;
end;
$$;
create trigger membership_count after insert or delete on public.community_members for each row execute function public.update_community_count();

create or replace function public.add_community_owner()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.community_members(community_id,user_id,role) values(new.id,new.owner_id,'owner') on conflict do nothing;
  return new;
end;
$$;
create trigger community_owner_membership after insert on public.communities for each row execute function public.add_community_owner();

create or replace function public.update_conversation_time()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin update public.conversations set updated_at=now() where id=new.conversation_id; return new; end;
$$;
create trigger message_bumps_conversation after insert on public.messages for each row execute function public.update_conversation_time();

create or replace function public.notify_post_reply()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare target_user uuid; community_slug text;
begin
  select p.author_id,c.slug into target_user,community_slug
  from public.posts p join public.communities c on c.id=p.community_id where p.id=new.post_id;
  if target_user is not null and target_user<>new.author_id then
    insert into public.notifications(user_id,kind,title,body,href)
    values(target_user,'reply','New reply on your VEXRA post',left(new.body,250),'/pages/community.html?slug='||community_slug);
  end if;
  return new;
end;
$$;
create trigger comment_reply_notification after insert on public.comments for each row execute function public.notify_post_reply();

create or replace function public.notify_message_recipients()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.notifications(user_id,kind,title,body,href)
  select m.user_id,'message','New private message','You received a VEXRA message.',
    '/pages/messages.html?conversation='||new.conversation_id::text
  from public.conversation_members m
  where m.conversation_id=new.conversation_id and m.user_id<>new.sender_id;
  return new;
end;
$$;
create trigger message_notification after insert on public.messages for each row execute function public.notify_message_recipients();

create or replace function public.start_direct_conversation(target_user uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare conversation_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if target_user is null or target_user=auth.uid() then raise exception 'Choose another public VEXRA player'; end if;
  if not exists(select 1 from public.profiles p join public.profile_privacy pp on pp.user_id=p.id where p.id=target_user and pp.visibility='public') then
    raise exception 'The player is private or unavailable';
  end if;
  insert into public.conversations(created_by) values(auth.uid()) returning id into conversation_id;
  insert into public.conversation_members(conversation_id,user_id) values(conversation_id,auth.uid()),(conversation_id,target_user);
  return conversation_id;
end;
$$;
revoke all on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

create view public.profile_cards with (security_barrier=true) as
select p.id,p.username,p.display_name,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'avatar')::boolean,true) then p.avatar_url else null end as avatar_url,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'bio')::boolean,false) then p.bio else null end as bio,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'games')::boolean,false)) as show_games,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'platforms')::boolean,false)) as show_platforms,
  p.created_at
from public.profiles p join public.profile_privacy pp on pp.user_id=p.id
where pp.visibility='public' or p.id=auth.uid();

create view public.public_profile_games with (security_barrier=true) as
select ug.user_id,g.slug,g.title,g.genre,ug.is_favorite,ug.is_currently_playing
from public.user_games ug join public.games g on g.id=ug.game_id
join public.profile_privacy pp on pp.user_id=ug.user_id
where (pp.visibility='public' and coalesce((pp.field_visibility->>'games')::boolean,false)) or ug.user_id=auth.uid();

create view public.public_profile_platforms with (security_barrier=true) as
select up.user_id,p.slug,p.name
from public.user_platforms up join public.platforms p on p.id=up.platform_id
join public.profile_privacy pp on pp.user_id=up.user_id
where (pp.visibility='public' and coalesce((pp.field_visibility->>'platforms')::boolean,false)) or up.user_id=auth.uid();

create view public.public_profile_achievements with (security_barrier=true) as
select a.user_id,a.title,a.description,a.awarded_at
from public.user_achievements a join public.profile_privacy pp on pp.user_id=a.user_id
where (pp.visibility='public' and coalesce((pp.field_visibility->>'achievements')::boolean,false)) or a.user_id=auth.uid();

create or replace function public.can_read_media_storage(object_path text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.media_items m where m.storage_path=object_path and
    (m.review_state='approved' and m.visibility='public' or m.owner_id=auth.uid() or public.is_vexra_moderator()));
$$;

-- Every user-owned table is protected. Public data is deliberately exposed by
-- narrow profile views or approved media/community policies rather than emails.
alter table public.profiles enable row level security;
alter table public.profile_privacy enable row level security;
alter table public.user_games enable row level security;
alter table public.user_platforms enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.media_items enable row level security;
alter table public.stream_links enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.user_achievements enable row level security;
alter table public.gaming_history enable row level security;
alter table public.account_preferences enable row level security;
alter table public.user_roles enable row level security;
alter table public.moderation_reports enable row level security;
alter table public.games enable row level security;
alter table public.platforms enable row level security;
alter table public.game_platforms enable row level security;

create policy "catalog readable" on public.games for select to anon,authenticated using (true);
create policy "platform catalog readable" on public.platforms for select to anon,authenticated using (true);
create policy "game platform catalog readable" on public.game_platforms for select to anon,authenticated using (true);

create policy "profile owner read" on public.profiles for select to authenticated using (id=auth.uid());
create policy "profile owner insert" on public.profiles for insert to authenticated with check (id=auth.uid());
create policy "profile owner update" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy "privacy owner manage" on public.profile_privacy for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "user game owner read" on public.user_games for select to authenticated using (user_id=auth.uid());
create policy "user game owner insert" on public.user_games for insert to authenticated with check (user_id=auth.uid());
create policy "user game owner update" on public.user_games for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "user game owner delete" on public.user_games for delete to authenticated using (user_id=auth.uid());
create policy "user platform owner manage" on public.user_platforms for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

create policy "community readable by visibility" on public.communities for select to anon,authenticated using (visibility='public' or owner_id=auth.uid() or public.is_community_member(id) or public.is_vexra_moderator());
create policy "community owner creates" on public.communities for insert to authenticated with check (owner_id=auth.uid());
create policy "community owner manages" on public.communities for update to authenticated using (owner_id=auth.uid() or public.is_vexra_moderator()) with check (owner_id=auth.uid() or public.is_vexra_moderator());
create policy "community owner deletes" on public.communities for delete to authenticated using (owner_id=auth.uid() or public.is_vexra_moderator());
create policy "community member list readable" on public.community_members for select to anon,authenticated using (public.can_view_community(community_id) or user_id=auth.uid());
create policy "members may join public communities" on public.community_members for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.communities c where c.id=community_id and c.visibility='public'));
create policy "members may leave or owner may manage" on public.community_members for delete to authenticated using (user_id=auth.uid() or exists(select 1 from public.communities c where c.id=community_id and c.owner_id=auth.uid()) or public.is_vexra_moderator());

create policy "posts visible with community" on public.posts for select to anon,authenticated using (public.can_view_community(community_id));
create policy "community members publish" on public.posts for insert to authenticated with check (author_id=auth.uid() and public.is_community_member(community_id));
create policy "post author or moderator updates" on public.posts for update to authenticated using (author_id=auth.uid() or public.is_vexra_moderator()) with check (author_id=auth.uid() or public.is_vexra_moderator());
create policy "post author or moderator deletes" on public.posts for delete to authenticated using (author_id=auth.uid() or public.is_vexra_moderator());
create policy "comments visible with post" on public.comments for select to anon,authenticated using (exists(select 1 from public.posts p where p.id=post_id and public.can_view_community(p.community_id)));
create policy "members comment" on public.comments for insert to authenticated with check (author_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and public.is_community_member(p.community_id)));
create policy "comment owner edit" on public.comments for update to authenticated using (author_id=auth.uid() or public.is_vexra_moderator()) with check (author_id=auth.uid() or public.is_vexra_moderator());
create policy "comment owner delete" on public.comments for delete to authenticated using (author_id=auth.uid() or public.is_vexra_moderator());
create policy "reactions visible with post" on public.post_reactions for select to anon,authenticated using (exists(select 1 from public.posts p where p.id=post_id and public.can_view_community(p.community_id)));
create policy "user reacts to visible post" on public.post_reactions for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.posts p where p.id=post_id and public.can_view_community(p.community_id)));
create policy "user removes own reaction" on public.post_reactions for delete to authenticated using (user_id=auth.uid());

create policy "public creators readable" on public.creator_profiles for select to anon,authenticated using (is_public or user_id=auth.uid());
create policy "creator owner inserts" on public.creator_profiles for insert to authenticated with check (user_id=auth.uid());
create policy "creator owner updates" on public.creator_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "creator owner deletes" on public.creator_profiles for delete to authenticated using (user_id=auth.uid());
create policy "approved media or owner readable" on public.media_items for select to anon,authenticated using ((review_state='approved' and visibility='public') or owner_id=auth.uid() or public.is_vexra_moderator());
create policy "media owner submits" on public.media_items for insert to authenticated with check (owner_id=auth.uid() and review_state='pending');
create policy "moderators review media" on public.media_items for update to authenticated using (public.is_vexra_moderator()) with check (public.is_vexra_moderator());
create policy "media owner removes pending or rejected" on public.media_items for delete to authenticated using ((owner_id=auth.uid() and review_state in ('pending','rejected')) or public.is_vexra_moderator());
create policy "public streams readable" on public.stream_links for select to anon,authenticated using (is_public or user_id=auth.uid() or public.is_vexra_moderator());
create policy "stream owner submits" on public.stream_links for insert to authenticated with check (user_id=auth.uid());
create policy "stream owner updates" on public.stream_links for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "stream owner deletes" on public.stream_links for delete to authenticated using (user_id=auth.uid());

create policy "conversation participants read" on public.conversations for select to authenticated using (public.is_conversation_member(id));
create policy "conversation members readable to participants" on public.conversation_members for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "message participants read" on public.messages for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "participants send own messages" on public.messages for insert to authenticated with check (sender_id=auth.uid() and public.is_conversation_member(conversation_id));
create policy "message sender deletes own" on public.messages for delete to authenticated using (sender_id=auth.uid());

create policy "notification owner read" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "notification owner marks read" on public.notifications for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "public challenges readable" on public.challenges for select to anon,authenticated using (is_public or created_by=auth.uid() or public.is_vexra_moderator());
create policy "moderator creates challenge" on public.challenges for insert to authenticated with check (created_by=auth.uid() and public.is_vexra_moderator());
create policy "challenge owner or moderator updates" on public.challenges for update to authenticated using (created_by=auth.uid() or public.is_vexra_moderator()) with check (created_by=auth.uid() or public.is_vexra_moderator());
create policy "challenge entries visible on public challenge" on public.challenge_entries for select to anon,authenticated using (exists(select 1 from public.challenges c where c.id=challenge_id and (c.is_public or c.created_by=auth.uid() or public.is_vexra_moderator())));
create policy "user submits own challenge result" on public.challenge_entries for insert to authenticated with check (user_id=auth.uid() and is_user_entered and exists(select 1 from public.challenges c where c.id=challenge_id and c.is_public and now() between c.starts_at and c.ends_at));
create policy "user updates own challenge result" on public.challenge_entries for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and is_user_entered);
create policy "user removes own challenge result" on public.challenge_entries for delete to authenticated using (user_id=auth.uid());
create policy "achievement owner manage" on public.user_achievements for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and is_user_entered);
create policy "history owner manage" on public.gaming_history for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and is_user_entered and source='player-entered');
create policy "preferences owner manage" on public.account_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "role self or moderators read" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.is_vexra_moderator());
create policy "report owner or moderator read" on public.moderation_reports for select to authenticated using (reporter_id=auth.uid() or public.is_vexra_moderator());
create policy "signed in users submit reports" on public.moderation_reports for insert to authenticated with check (reporter_id=auth.uid() and status='pending');
create policy "moderators update reports" on public.moderation_reports for update to authenticated using (public.is_vexra_moderator()) with check (public.is_vexra_moderator());

grant select on public.games,public.platforms,public.game_platforms to anon,authenticated;
grant select on public.profile_cards,public.public_profile_games,public.public_profile_platforms,public.public_profile_achievements to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.profile_privacy,public.user_games,public.user_platforms,public.communities,public.community_members,public.posts,public.comments,public.post_reactions,public.creator_profiles,public.media_items,public.stream_links,public.conversations,public.conversation_members,public.messages,public.notifications,public.challenges,public.challenge_entries,public.user_achievements,public.gaming_history,public.account_preferences,public.user_roles,public.moderation_reports to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vexra-avatars','vexra-avatars',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vexra-media','vexra-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "avatar images readable" on storage.objects for select to anon,authenticated using (bucket_id='vexra-avatars');
create policy "upload own avatar" on storage.objects for insert to authenticated with check (bucket_id='vexra-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "update own avatar" on storage.objects for update to authenticated using (bucket_id='vexra-avatars' and (storage.foldername(name))[1]=auth.uid()::text) with check (bucket_id='vexra-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "remove own avatar" on storage.objects for delete to authenticated using (bucket_id='vexra-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "approved media files readable" on storage.objects for select to anon,authenticated using (bucket_id='vexra-media' and public.can_read_media_storage(name));
create policy "upload own media files" on storage.objects for insert to authenticated with check (bucket_id='vexra-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "remove own media files" on storage.objects for delete to authenticated using (bucket_id='vexra-media' and (storage.foldername(name))[1]=auth.uid()::text);

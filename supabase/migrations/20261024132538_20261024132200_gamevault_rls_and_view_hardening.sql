-- Tighten policies reintroduced by the GTA migration and keep privacy-filtered
-- profile views from running with the view owner's privileges.

-- Approval and invite-only communities must not inherit the older open-join rule.
drop policy if exists "members may join public communities" on public.community_members;

-- Preserve block checks and GTA-only public visibility after the catalog migration.
drop policy if exists "approved media or owner readable" on public.media_items;
alter policy "approved media or owner readable with block checks" on public.media_items
  using (
    (
      (review_state='approved' and visibility='public'
        and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto'))
      or owner_id=(select auth.uid())
      or public.is_vexra_moderator()
    )
    and not public.is_blocked_for_current_user(owner_id)
  );
drop policy if exists "public streams readable" on public.stream_links;
alter policy "public streams readable with block checks" on public.stream_links
  using (
    (
      (is_public and game_id is not null
        and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto'))
      or user_id=(select auth.uid())
      or public.is_vexra_moderator()
    )
    and not public.is_blocked_for_current_user(user_id)
  );

-- Trigger functions are never intended to be called as Data API RPCs. Removing
-- default PUBLIC execution does not stop PostgreSQL from invoking their triggers.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.add_community_owner() from public, anon, authenticated;
revoke all on function public.update_community_count() from public, anon, authenticated;
revoke all on function public.update_conversation_time() from public, anon, authenticated;
revoke all on function public.notify_post_reply() from public, anon, authenticated;
revoke all on function public.notify_message_recipients() from public, anon, authenticated;
revoke all on function public.notify_community_invitation() from public, anon, authenticated;
revoke all on function public.notify_community_join_request() from public, anon, authenticated;
revoke all on function public.notify_moderation_reporter() from public, anon, authenticated;
revoke all on function public.notify_mentions_from_content() from public, anon, authenticated;
revoke all on function public.notify_connection_request() from public, anon, authenticated;
revoke all on function public.audit_moderation_change() from public, anon, authenticated;

-- Non-exposed helper functions retain the strict field-level and block filters,
-- while the public views themselves use invoker permissions.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to anon, authenticated, service_role;

create or replace function app_private.profile_cards()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  show_games boolean,
  show_platforms boolean,
  created_at timestamptz,
  social_links jsonb,
  show_socials boolean,
  show_connections boolean
)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select p.id,p.username,p.display_name,
    case when p.id=auth.uid() or coalesce((pp.field_visibility->>'avatar')::boolean,true) then p.avatar_url else null end,
    case when p.id=auth.uid() or coalesce((pp.field_visibility->>'bio')::boolean,false) then p.bio else null end,
    (p.id=auth.uid() or coalesce((pp.field_visibility->>'games')::boolean,false)),
    (p.id=auth.uid() or coalesce((pp.field_visibility->>'platforms')::boolean,false)),
    p.created_at,
    case when p.id=auth.uid() or coalesce((pp.field_visibility->>'socials')::boolean,false) then p.social_links else '{}'::jsonb end,
    (p.id=auth.uid() or coalesce((pp.field_visibility->>'socials')::boolean,false)),
    (p.id=auth.uid() or coalesce((pp.field_visibility->>'connections')::boolean,false))
  from public.profiles p
  join public.profile_privacy pp on pp.user_id=p.id
  where (pp.visibility='public' or p.id=auth.uid())
    and not public.is_blocked_for_current_user(p.id);
$$;

create or replace function app_private.public_profile_games()
returns table (user_id uuid, slug text, title text, genre text, is_favorite boolean, is_currently_playing boolean)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select ug.user_id,g.slug,g.title,g.genre,ug.is_favorite,ug.is_currently_playing
  from public.user_games ug
  join public.games g on g.id=ug.game_id
  join public.profile_privacy pp on pp.user_id=ug.user_id
  where g.franchise='grand-theft-auto'
    and ((pp.visibility='public' and coalesce((pp.field_visibility->>'games')::boolean,false)) or ug.user_id=auth.uid())
    and not public.is_blocked_for_current_user(ug.user_id);
$$;

create or replace function app_private.public_profile_platforms()
returns table (user_id uuid, slug text, name text)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select up.user_id,p.slug,p.name
  from public.user_platforms up
  join public.platforms p on p.id=up.platform_id
  join public.profile_privacy pp on pp.user_id=up.user_id
  where ((pp.visibility='public' and coalesce((pp.field_visibility->>'platforms')::boolean,false)) or up.user_id=auth.uid())
    and not public.is_blocked_for_current_user(up.user_id);
$$;

create or replace function app_private.public_profile_achievements()
returns table (user_id uuid, title text, description text, awarded_at timestamptz)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select a.user_id,a.title,a.description,a.awarded_at
  from public.user_achievements a
  join public.profile_privacy pp on pp.user_id=a.user_id
  where ((pp.visibility='public' and coalesce((pp.field_visibility->>'achievements')::boolean,false)) or a.user_id=auth.uid())
    and not public.is_blocked_for_current_user(a.user_id);
$$;

create or replace function app_private.public_profile_connections()
returns table (user_id uuid, connected_user_id uuid, username text, display_name text)
language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  with endpoints as (
    select c.user_low as user_id,c.user_high as connected_user_id from public.connections c
    union all
    select c.user_high,c.user_low from public.connections c
  )
  select e.user_id,e.connected_user_id,p.username,p.display_name
  from endpoints e
  join public.profile_privacy pp on pp.user_id=e.user_id
  join app_private.profile_cards() p on p.id=e.connected_user_id
  where ((e.user_id=auth.uid()) or (pp.visibility='public' and coalesce((pp.field_visibility->>'connections')::boolean,false)))
    and not public.is_blocked_for_current_user(e.connected_user_id);
$$;

revoke all on function app_private.profile_cards() from public;
revoke all on function app_private.public_profile_games() from public;
revoke all on function app_private.public_profile_platforms() from public;
revoke all on function app_private.public_profile_achievements() from public;
revoke all on function app_private.public_profile_connections() from public;
grant execute on function app_private.profile_cards() to anon,authenticated,service_role;
grant execute on function app_private.public_profile_games() to anon,authenticated,service_role;
grant execute on function app_private.public_profile_platforms() to anon,authenticated,service_role;
grant execute on function app_private.public_profile_achievements() to anon,authenticated,service_role;
grant execute on function app_private.public_profile_connections() to anon,authenticated,service_role;

create or replace view public.profile_cards with (security_barrier=true,security_invoker=true) as
  select * from app_private.profile_cards();
create or replace view public.public_profile_games with (security_barrier=true,security_invoker=true) as
  select * from app_private.public_profile_games();
create or replace view public.public_profile_platforms with (security_barrier=true,security_invoker=true) as
  select * from app_private.public_profile_platforms();
create or replace view public.public_profile_achievements with (security_barrier=true,security_invoker=true) as
  select * from app_private.public_profile_achievements();
create or replace view public.public_profile_connections with (security_barrier=true,security_invoker=true) as
  select * from app_private.public_profile_connections();

grant select on public.profile_cards,public.public_profile_games,public.public_profile_platforms,
  public.public_profile_achievements,public.public_profile_connections to anon,authenticated;

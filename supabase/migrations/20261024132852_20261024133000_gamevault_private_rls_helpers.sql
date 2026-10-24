begin;

-- Internal RLS helpers are dependencies of policies, not public Data API RPCs.
alter function public.is_vexra_moderator() set schema app_private;
alter function public.is_community_member(uuid) set schema app_private;
alter function public.can_view_community(uuid) set schema app_private;
alter function public.is_conversation_member(uuid) set schema app_private;
alter function public.can_read_media_storage(text) set schema app_private;
alter function public.is_blocked_for_current_user(uuid) set schema app_private;
alter function public.is_muted_by_current_user(uuid) set schema app_private;
alter function public.is_public_vexra_profile(uuid) set schema app_private;
alter function public.can_manage_community(uuid) set schema app_private;
alter function public.can_access_conversation(uuid) set schema app_private;
alter function public.can_upload_vexra_object(text,uuid) set schema app_private;

-- Rebuild stored function bodies with private helper names, including the
-- profile-view helpers and retained, permission-checked RPC action functions.
do $rebind$
declare f record; definition text;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname in ('public','app_private') and (
      p.prosrc like '%public.can_manage_community%'
      or p.prosrc like '%public.can_read_media_storage%'
      or p.prosrc like '%public.can_view_community%'
      or p.prosrc like '%public.is_blocked_for_current_user%'
      or p.prosrc like '%public.is_community_member%'
      or p.prosrc like '%public.is_conversation_member%'
      or p.prosrc like '%public.is_muted_by_current_user%'
      or p.prosrc like '%public.is_public_vexra_profile%'
      or p.prosrc like '%public.is_vexra_moderator%'
      or p.prosrc like '%public.can_access_conversation%'
      or p.prosrc like '%public.can_upload_vexra_object%'
    )
  loop
    definition:=pg_get_functiondef(f.oid);
    definition:=replace(definition,'public.can_manage_community','app_private.can_manage_community');
    definition:=replace(definition,'public.can_read_media_storage','app_private.can_read_media_storage');
    definition:=replace(definition,'public.can_view_community','app_private.can_view_community');
    definition:=replace(definition,'public.is_blocked_for_current_user','app_private.is_blocked_for_current_user');
    definition:=replace(definition,'public.is_community_member','app_private.is_community_member');
    definition:=replace(definition,'public.is_conversation_member','app_private.is_conversation_member');
    definition:=replace(definition,'public.is_muted_by_current_user','app_private.is_muted_by_current_user');
    definition:=replace(definition,'public.is_public_vexra_profile','app_private.is_public_vexra_profile');
    definition:=replace(definition,'public.is_vexra_moderator','app_private.is_vexra_moderator');
    definition:=replace(definition,'public.can_access_conversation','app_private.can_access_conversation');
    definition:=replace(definition,'public.can_upload_vexra_object','app_private.can_upload_vexra_object');
    execute definition;
  end loop;
end
$rebind$;

-- Storage reads also honor user blocks; moderators retain review access.
create or replace function app_private.can_read_media_storage(object_path text)
returns boolean language sql stable security definer set search_path=pg_catalog,pg_temp as $$
  select exists(select 1 from public.media_items m where m.storage_path=object_path and (
    app_private.is_vexra_moderator()
    or (not app_private.is_blocked_for_current_user(m.owner_id) and (
      m.owner_id=auth.uid()
      or (m.review_state='approved' and m.visibility='public'
        and exists(select 1 from public.games g where g.id=m.game_id and g.franchise='grand-theft-auto'))
    ))
  ));
$$;

-- Private helpers remain callable by policy evaluation; app_private is not an
-- exposed PostgREST schema, so these grants do not create public RPC endpoints.
revoke all on schema app_private from public,anon,authenticated;
grant usage on schema app_private to anon,authenticated,service_role;
revoke all on all functions in schema app_private from public,anon,authenticated;
grant execute on all functions in schema app_private to anon,authenticated,service_role;

commit;


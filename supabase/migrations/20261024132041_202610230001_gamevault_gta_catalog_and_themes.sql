-- GameVault focuses on Grand Theft Auto. Legacy catalog rows remain in place
-- for referential integrity, but are hidden from normal reads and cannot be
-- selected in new libraries or communities.
alter table public.games
  add column if not exists franchise text not null default 'other';

alter table public.games drop constraint if exists games_franchise_check;
alter table public.games add constraint games_franchise_check
  check (franchise in ('grand-theft-auto', 'other'));

update public.games set franchise = 'other';
update public.games
set franchise = 'grand-theft-auto'
where slug in (
  'grand-theft-auto',
  'grand-theft-auto-london-1969',
  'grand-theft-auto-london-1961',
  'grand-theft-auto-2',
  'grand-theft-auto-iii',
  'grand-theft-auto-vice-city',
  'grand-theft-auto-san-andreas',
  'grand-theft-auto-advance',
  'grand-theft-auto-liberty-city-stories',
  'grand-theft-auto-vice-city-stories',
  'grand-theft-auto-chinatown-wars',
  'grand-theft-auto-iv',
  'grand-theft-auto-iv-the-lost-and-damned',
  'grand-theft-auto-the-ballad-of-gay-tony',
  'grand-theft-auto-episodes-from-liberty-city',
  'grand-theft-auto-v',
  'grand-theft-auto-online',
  'grand-theft-auto-the-trilogy-definitive-edition',
  'grand-theft-auto-vi'
);

drop policy if exists "catalog readable" on public.games;
create policy "catalog readable" on public.games
  for select to anon, authenticated using (franchise = 'grand-theft-auto');

drop policy if exists "game platform catalog readable" on public.game_platforms;
create policy "game platform catalog readable" on public.game_platforms
  for select to anon, authenticated using (
    exists (
      select 1 from public.games g
      where g.id = game_id and g.franchise = 'grand-theft-auto'
    )
  );

alter table public.account_preferences
  add column if not exists ui_theme text not null default 'vice-city';
alter table public.account_preferences drop constraint if exists account_preferences_ui_theme_check;
alter table public.account_preferences add constraint account_preferences_ui_theme_check
  check (ui_theme in ('vice-city', 'liberty-city', 'san-andreas', 'gta-iv', 'los-santos', 'leonida'));

create or replace function public.can_view_community(target uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.communities c
    where c.id = target and (
      public.is_vexra_moderator()
      or (
        c.game_id is not null
        and exists (
          select 1 from public.games g
          where g.id = c.game_id and g.franchise = 'grand-theft-auto'
        )
        and (c.visibility = 'public' or c.owner_id = auth.uid() or public.is_community_member(c.id))
      )
    )
  );
$$;

drop policy if exists "community readable by visibility" on public.communities;
create policy "community readable by visibility" on public.communities
  for select to anon, authenticated using (
    public.is_vexra_moderator()
    or (
      game_id is not null
      and exists (
        select 1 from public.games g
        where g.id = game_id and g.franchise = 'grand-theft-auto'
      )
      and (visibility = 'public' or owner_id = auth.uid() or public.is_community_member(id))
    )
  );

drop policy if exists "community owner creates" on public.communities;
create policy "community owner creates" on public.communities
  for insert to authenticated with check (
    owner_id = auth.uid()
    and game_id is not null
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.franchise = 'grand-theft-auto'
    )
  );

drop policy if exists "community owner manages" on public.communities;
create policy "community owner manages" on public.communities
  for update to authenticated using (owner_id = auth.uid() or public.is_vexra_moderator())
  with check (
    public.is_vexra_moderator()
    or (
      owner_id = auth.uid()
      and game_id is not null
      and exists (
        select 1 from public.games g
        where g.id = game_id and g.franchise = 'grand-theft-auto'
      )
    )
  );

drop policy if exists "members may join public communities" on public.community_members;
create policy "members may join public communities" on public.community_members
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.communities c
      join public.games g on g.id = c.game_id
      where c.id = community_id and c.visibility = 'public'
        and g.franchise = 'grand-theft-auto'
    )
  );

drop policy if exists "user game owner insert" on public.user_games;
create policy "user game owner insert" on public.user_games
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.franchise = 'grand-theft-auto'
    )
  );

drop policy if exists "user game owner update" on public.user_games;
create policy "user game owner update" on public.user_games
  for update to authenticated using (user_id = auth.uid()) with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.franchise = 'grand-theft-auto'
    )
  );
-- Keep game-linked community features inside the GTA franchise at the database
-- boundary, including views that otherwise could bypass the games table policy.
create or replace view public.public_profile_games with (security_barrier=true) as
select ug.user_id,g.slug,g.title,g.genre,ug.is_favorite,ug.is_currently_playing
from public.user_games ug
join public.games g on g.id=ug.game_id
join public.profile_privacy pp on pp.user_id=ug.user_id
where g.franchise='grand-theft-auto'
  and ((pp.visibility='public' and coalesce((pp.field_visibility->>'games')::boolean,false)) or ug.user_id=auth.uid());

create or replace function public.can_read_media_storage(object_path text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(
    select 1 from public.media_items m
    where m.storage_path=object_path and (
      (m.review_state='approved' and m.visibility='public'
        and exists(select 1 from public.games g where g.id=m.game_id and g.franchise='grand-theft-auto'))
      or m.owner_id=auth.uid()
      or public.is_vexra_moderator()
    )
  );
$$;

drop policy if exists "approved media or owner readable" on public.media_items;
create policy "approved media or owner readable" on public.media_items
  for select to anon, authenticated using (
    (review_state='approved' and visibility='public'
      and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto'))
    or owner_id=auth.uid()
    or public.is_vexra_moderator()
  );

drop policy if exists "media owner submits" on public.media_items;
create policy "media owner submits" on public.media_items
  for insert to authenticated with check (
    owner_id=auth.uid() and review_state='pending' and game_id is not null
    and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto')
  );

drop policy if exists "public streams readable" on public.stream_links;
create policy "public streams readable" on public.stream_links
  for select to anon, authenticated using (
    (is_public and game_id is not null
      and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto'))
    or user_id=auth.uid()
    or public.is_vexra_moderator()
  );

drop policy if exists "stream owner submits" on public.stream_links;
create policy "stream owner submits" on public.stream_links
  for insert to authenticated with check (
    user_id=auth.uid() and game_id is not null
    and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto')
  );

drop policy if exists "stream owner updates" on public.stream_links;
create policy "stream owner updates" on public.stream_links
  for update to authenticated using (user_id=auth.uid()) with check (
    user_id=auth.uid() and game_id is not null
    and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto')
  );

drop policy if exists "public challenges readable" on public.challenges;
create policy "public challenges readable" on public.challenges
  for select to anon, authenticated using (
    public.is_vexra_moderator()
    or created_by=auth.uid()
    or (is_public and game_id is not null
      and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto'))
  );

drop policy if exists "moderator creates challenge" on public.challenges;
create policy "moderator creates challenge" on public.challenges
  for insert to authenticated with check (
    created_by=auth.uid() and public.is_vexra_moderator()
    and game_id is not null
    and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto')
  );

drop policy if exists "challenge owner or moderator updates" on public.challenges;
create policy "challenge owner or moderator updates" on public.challenges
  for update to authenticated using (created_by=auth.uid() or public.is_vexra_moderator())
  with check (
    public.is_vexra_moderator()
    or (created_by=auth.uid() and game_id is not null
      and exists(select 1 from public.games g where g.id=game_id and g.franchise='grand-theft-auto'))
  );

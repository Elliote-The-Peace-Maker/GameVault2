-- Evaluate per-request JWT and moderator helpers once per query as recommended
-- by Supabase's RLS guidance, rather than once for each candidate row.

drop policy "players read their own GTA progress" on public.game_progress_entries;
drop policy "players add their own GTA progress" on public.game_progress_entries;
drop policy "players update their own GTA progress" on public.game_progress_entries;
drop policy "players delete their own GTA progress" on public.game_progress_entries;

create policy "players read their own GTA progress"
  on public.game_progress_entries for select to authenticated
  using (user_id = (select auth.uid()));
create policy "players add their own GTA progress"
  on public.game_progress_entries for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and is_user_entered
    and exists (
      select 1 from public.games g
      where g.id = game_progress_entries.game_id and g.franchise = 'grand-theft-auto'
    )
  );
create policy "players update their own GTA progress"
  on public.game_progress_entries for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and is_user_entered
    and exists (
      select 1 from public.games g
      where g.id = game_progress_entries.game_id and g.franchise = 'grand-theft-auto'
    )
  );
create policy "players delete their own GTA progress"
  on public.game_progress_entries for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy "read approved GTA news or own submissions or moderator queue" on public.game_news;
drop policy "signed in players submit pending GTA news" on public.game_news;
drop policy "moderators review GTA news" on public.game_news;
drop policy "authors remove unreviewed GTA news" on public.game_news;

create policy "read approved GTA news or own submissions or moderator queue"
  on public.game_news for select to anon, authenticated
  using (
    status = 'approved'
    or created_by = (select auth.uid())
    or (select app_private.is_vexra_moderator())
  );
create policy "signed in players submit pending GTA news"
  on public.game_news for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and (
      game_id is null
      or exists (
        select 1 from public.games g
        where g.id = game_news.game_id and g.franchise = 'grand-theft-auto'
      )
    )
  );
create policy "moderators review GTA news"
  on public.game_news for update to authenticated
  using ((select app_private.is_vexra_moderator()))
  with check (
    (select app_private.is_vexra_moderator())
    and (
      game_id is null
      or exists (
        select 1 from public.games g
        where g.id = game_news.game_id and g.franchise = 'grand-theft-auto'
      )
    )
  );
create policy "authors remove unreviewed GTA news"
  on public.game_news for delete to authenticated
  using (
    (created_by = (select auth.uid()) and status in ('pending','rejected'))
    or (select app_private.is_vexra_moderator())
  );

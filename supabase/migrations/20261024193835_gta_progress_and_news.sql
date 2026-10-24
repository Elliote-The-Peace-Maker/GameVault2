-- Account-owned, player-entered GTA progress plus a moderated source-link news feed.
-- This stores no Rockstar account data and makes no automatic gameplay claims.

create table public.game_progress_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  category text not null check (category in (
    'missions','districts','vehicles','personal-records','time-trials','gang-reputation',
    'story-missions','side-missions','collectibles','rampages','stunt-jumps','asset-missions',
    'territories','schools','safehouses','empire-sites','drug-deals','side-activities',
    'achievements','base-jumps','heists','strangers-freaks','hobbies','properties','regions',
    'career-progress','jobs','businesses','weekly-challenges','collections','discovery',
    'episode-progress','launch-watchlist','edition-progress','personal-goals'
  )),
  title text not null check (char_length(title) between 1 and 140),
  status text not null default 'planned' check (status in (
    'planned','in_progress','completed','discovered','owned','wanted','skipped'
  )),
  note text not null default '' check (char_length(note) <= 500),
  is_user_entered boolean not null default true check (is_user_entered),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id, category, title)
);

create index game_progress_entries_owner_game_updated_idx
  on public.game_progress_entries (user_id, game_id, updated_at desc);
create index game_progress_entries_owner_created_idx
  on public.game_progress_entries (user_id, created_at desc);

alter table public.game_progress_entries enable row level security;

create policy "players read their own GTA progress"
  on public.game_progress_entries for select to authenticated
  using (user_id = auth.uid());
create policy "players add their own GTA progress"
  on public.game_progress_entries for insert to authenticated
  with check (
    user_id = auth.uid()
    and is_user_entered
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.franchise = 'grand-theft-auto'
    )
  );
create policy "players update their own GTA progress"
  on public.game_progress_entries for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and is_user_entered
    and exists (
      select 1 from public.games g
      where g.id = game_id and g.franchise = 'grand-theft-auto'
    )
  );
create policy "players delete their own GTA progress"
  on public.game_progress_entries for delete to authenticated
  using (user_id = auth.uid());

create table public.game_news (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 1600),
  source_label text not null check (char_length(source_label) between 1 and 80),
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$'),
  published_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved','rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index game_news_public_date_idx
  on public.game_news (published_at desc, created_at desc) where status = 'approved';
create index game_news_game_public_date_idx
  on public.game_news (game_id, published_at desc) where status = 'approved';
create index game_news_author_state_idx
  on public.game_news (created_by, status, created_at desc);

alter table public.game_news enable row level security;

create policy "read approved GTA news or own submissions or moderator queue"
  on public.game_news for select to anon, authenticated
  using (
    status = 'approved'
    or created_by = auth.uid()
    or app_private.is_vexra_moderator()
  );
create policy "signed in players submit pending GTA news"
  on public.game_news for insert to authenticated
  with check (
    created_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and (
      game_id is null
      or exists (
        select 1 from public.games g
        where g.id = game_id and g.franchise = 'grand-theft-auto'
      )
    )
  );
create policy "moderators review GTA news"
  on public.game_news for update to authenticated
  using (app_private.is_vexra_moderator())
  with check (
    app_private.is_vexra_moderator()
    and (
      game_id is null
      or exists (
        select 1 from public.games g
        where g.id = game_id and g.franchise = 'grand-theft-auto'
      )
    )
  );
create policy "authors remove unreviewed GTA news"
  on public.game_news for delete to authenticated
  using ((created_by = auth.uid() and status in ('pending','rejected')) or app_private.is_vexra_moderator());

grant select on public.game_news to anon;
grant select, insert, update, delete on public.game_progress_entries, public.game_news to authenticated;

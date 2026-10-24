-- Cover foreign-key lookups used when a game or reviewing account is removed.
create index game_progress_entries_by_game_idx
  on public.game_progress_entries (game_id);
create index game_news_reviewed_by_idx
  on public.game_news (reviewed_by);

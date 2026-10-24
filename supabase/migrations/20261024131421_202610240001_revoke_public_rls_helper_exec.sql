-- The Supabase-provided event trigger still runs as its owner, but must not be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

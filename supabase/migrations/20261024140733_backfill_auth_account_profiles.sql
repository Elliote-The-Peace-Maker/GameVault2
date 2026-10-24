begin;

-- Repair application records for Auth accounts created before the signup trigger
-- was installed. New signups continue to use the same trigger path.
do $$
declare
  account record;
  username_candidate text;
  shown_name text;
  fallback_name text;
begin
  for account in
    select id, raw_user_meta_data
    from auth.users
  loop
    fallback_name := 'player_' || substr(replace(account.id::text, '-', ''), 1, 16);
    username_candidate := lower(coalesce(account.raw_user_meta_data->>'username', fallback_name));
    if username_candidate !~ '^[a-z0-9_]{3,24}$' then
      username_candidate := fallback_name;
    end if;
    shown_name := left(coalesce(nullif(account.raw_user_meta_data->>'display_name', ''), username_candidate), 60);

    insert into public.profiles(id, username, display_name)
    values (account.id, username_candidate, shown_name)
    on conflict (username) do nothing;

    if not exists (select 1 from public.profiles p where p.id = account.id) then
      insert into public.profiles(id, username, display_name)
      values (account.id, fallback_name, shown_name)
      on conflict (username) do nothing;
    end if;

    if not exists (select 1 from public.profiles p where p.id = account.id) then
      raise exception 'Could not create a unique profile for an existing Auth account';
    end if;

    insert into public.profile_privacy(user_id)
    values (account.id)
    on conflict do nothing;

    insert into public.account_preferences(user_id)
    values (account.id)
    on conflict do nothing;
  end loop;
end;
$$;

commit;

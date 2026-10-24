-- Deliver @username mention notices only when the mentioned account can read
-- the post's community (public community or an existing member).
create or replace function public.notify_mentions_from_content()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_author uuid;
  target_post uuid;
  target_community uuid;
  target_slug text;
  recipient uuid;
begin
  if tg_table_name='posts' then
    target_author := new.author_id;
    target_post := new.id;
    target_community := new.community_id;
  else
    target_author := new.author_id;
    target_post := new.post_id;
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
  loop
    insert into public.notifications(user_id,kind,title,body,href)
    values(recipient,'mention','You were mentioned on VEXRA','A member mentioned you in a community post.','/pages/community.html?slug='||target_slug);
  end loop;
  return new;
end;
$$;
create trigger post_mention_notifications after insert on public.posts for each row execute function public.notify_mentions_from_content();
create trigger comment_mention_notifications after insert on public.comments for each row execute function public.notify_mentions_from_content();

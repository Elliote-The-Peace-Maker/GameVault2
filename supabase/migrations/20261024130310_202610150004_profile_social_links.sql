alter table public.profiles
  add column social_links jsonb not null default '{}'::jsonb
  check (jsonb_typeof(social_links)='object');

alter table public.profile_privacy
  alter column field_visibility set default '{"avatar":true,"bio":true,"games":false,"achievements":false,"platforms":false,"socials":false}'::jsonb;
update public.profile_privacy
set field_visibility=field_visibility||'{"socials":false}'::jsonb
where not (field_visibility ? 'socials');

create or replace view public.profile_cards with (security_barrier=true) as
select p.id,p.username,p.display_name,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'avatar')::boolean,true) then p.avatar_url else null end as avatar_url,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'bio')::boolean,false) then p.bio else null end as bio,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'games')::boolean,false)) as show_games,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'platforms')::boolean,false)) as show_platforms,
  p.created_at,
  case when p.id=auth.uid() or coalesce((pp.field_visibility->>'socials')::boolean,false) then p.social_links else '{}'::jsonb end as social_links,
  (p.id=auth.uid() or coalesce((pp.field_visibility->>'socials')::boolean,false)) as show_socials
from public.profiles p join public.profile_privacy pp on pp.user_id=p.id
where pp.visibility='public' or p.id=auth.uid();

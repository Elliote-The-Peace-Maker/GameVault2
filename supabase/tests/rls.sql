begin;
create extension if not exists pgtap with schema extensions;
select plan(42);

-- Stable throwaway users are inserted as the local database owner. The auth
-- trigger creates their private VEXRA profile/settings records.
insert into auth.users (id,email,encrypted_password,raw_user_meta_data,created_at,updated_at)
values
 ('10000000-0000-4000-8000-000000000001','rls-a@example.invalid','', '{"username":"rls_player_a","display_name":"RLS Player A"}',now(),now()),
 ('10000000-0000-4000-8000-000000000002','rls-b@example.invalid','', '{"username":"rls_player_b","display_name":"RLS Player B"}',now(),now())
on conflict (id) do nothing;

insert into public.games (slug,title,genre,description,catalog_note,franchise)
values ('rls-policy-fixture','RLS policy fixture','Test','Test-only database fixture.','Test fixture; not a game catalog seed.','grand-theft-auto')
on conflict (slug) do nothing;
insert into public.communities(slug,name,owner_id,visibility,membership_mode,game_id)
select fixture.slug,fixture.name,'10000000-0000-4000-8000-000000000002','public',fixture.membership_mode,g.id
from (values
  ('rls-open-community','RLS open community','open'),
  ('rls-approval-community','RLS approval community','approval')
) as fixture(slug,name,membership_mode)
join public.games g on g.slug='rls-policy-fixture';
insert into public.posts(id,community_id,author_id,body)
select '50000000-0000-4000-8000-000000000001',c.id,c.owner_id,'RLS notification preference fixture'
from public.communities c where c.slug='rls-open-community';

update public.profiles set bio='Private original' where id='10000000-0000-4000-8000-000000000002';
update public.profiles set social_links='{"discord":"https://discord.gg/vexratest"}'::jsonb where id='10000000-0000-4000-8000-000000000002';
update public.profile_privacy set visibility='private',field_visibility='{"avatar":true,"bio":false,"games":true,"achievements":true,"platforms":true}'::jsonb where user_id='10000000-0000-4000-8000-000000000002';

select hasnt_column('public','profiles','email','profile table contains no duplicate email field');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

select is((select count(*)::int from public.profiles where id='10000000-0000-4000-8000-000000000002'),0,'account A cannot select account B base profile');
select is((select count(*)::int from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),0,'private profile card is hidden');
reset role;
update public.profile_privacy set visibility='public' where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select count(*)::int from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),1,'public profile card is visible');
select is((select bio from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),null::text,'field-level privacy hides the bio');
select is((select social_links from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),'{}'::jsonb,'field-level privacy hides social links');
reset role;
update public.profile_privacy set field_visibility=field_visibility||'{"socials":true}'::jsonb where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select is((select social_links from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),' {"discord":"https://discord.gg/vexratest"}'::jsonb,'field-level privacy can make social links public');
reset role;
update public.profile_privacy set visibility='public' where user_id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.connection_requests(id,sender_id,recipient_id)
values('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.respond_to_connection_request('30000000-0000-4000-8000-000000000001',false)$$,'P0001',null,'requester cannot decide their own request');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.respond_to_connection_request('30000000-0000-4000-8000-000000000001',false)$$,'recipient can decline a pending request');
select ok((select decline_sequence is not null from public.connection_requests where id='30000000-0000-4000-8000-000000000001'),'decline receives sequence-based ordering');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.send_connection_request('10000000-0000-4000-8000-000000000002')$$,'P0001',null,'same-direction retry is blocked during 30-day cooldown');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.send_connection_request('10000000-0000-4000-8000-000000000001')$$,'reverse-direction request remains allowed after a decline');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.respond_to_connection_request((select id from public.connection_requests where sender_id='10000000-0000-4000-8000-000000000002' and recipient_id='10000000-0000-4000-8000-000000000001' and status='pending'),true)$$,'only the reverse request recipient can accept');
select is((select count(*)::int from public.connections where user_low='10000000-0000-4000-8000-000000000001' and user_high='10000000-0000-4000-8000-000000000002'),1,'accepted request creates one mutual connection');
select lives_ok($$insert into public.user_blocks(blocker_id,blocked_id) values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')$$,'account A can block another account');
select is((select count(*)::int from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),0,'a blocked profile is hidden from the blocker');
select lives_ok($$delete from public.user_blocks where blocker_id='10000000-0000-4000-8000-000000000001' and blocked_id='10000000-0000-4000-8000-000000000002'$$,'account A can remove its own block');
select is((select count(*)::int from public.profile_cards where id='10000000-0000-4000-8000-000000000002'),1,'unblocked public profile becomes visible again');
select lives_ok($$insert into public.user_mutes(muter_id,muted_id) values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002')$$,'account A can mute another account');
select is((select count(*)::int from public.user_mutes where muter_id='10000000-0000-4000-8000-000000000001' and muted_id='10000000-0000-4000-8000-000000000002'),1,'mute setting is visible to its owner');
select lives_ok($$insert into public.community_members(community_id,user_id,role) select id,'10000000-0000-4000-8000-000000000001','member' from public.communities where slug='rls-open-community'$$,'player can join an open public community');
select throws_ok($$insert into public.community_members(community_id,user_id,role) select id,'10000000-0000-4000-8000-000000000001','owner' from public.communities where slug='rls-open-community'$$,'42501',null,'player cannot grant themselves a community role');
select is((select relrowsecurity from pg_class where oid='public.user_action_limits'::regclass),true,'rate counters have row-level security enabled');
select is(has_table_privilege('authenticated','public.user_action_limits','select'),false,'players cannot read rate-limit counters');
select is(app_private.can_upload_vexra_object('vexra-media','10000000-0000-4000-8000-000000000001'),true,'player can check their own available media upload quota');
select is(app_private.can_upload_vexra_object('vexra-media','10000000-0000-4000-8000-000000000002'),false,'player cannot inspect another account upload quota');
select lives_ok($$insert into public.posts(community_id,author_id,body)
  select c.id,'10000000-0000-4000-8000-000000000001','Rate limit fixture '||g.n
  from public.communities c cross join generate_series(1,5) as g(n) where c.slug='rls-open-community'$$,
  'player can publish within the post quota');
select throws_ok($$insert into public.posts(community_id,author_id,body)
  select id,'10000000-0000-4000-8000-000000000001','Over quota fixture' from public.communities where slug='rls-open-community'$$,
  'P0001',null,'database blocks a sixth post inside the ten-minute window');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select lives_ok($$insert into public.posts(community_id,author_id,body)
  select id,'10000000-0000-4000-8000-000000000002','Independent account quota' from public.communities where slug='rls-open-community'$$,
  'another account has a separate post quota');
reset role;
reset role;
update public.account_preferences set notification_preferences=notification_preferences||'{"replies":false}'::jsonb where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.comments(post_id,author_id,body) values ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Preference disabled reply')$$,'member can comment when reply notifications are disabled');
reset role;
select is((select count(*)::int from public.notifications where user_id='10000000-0000-4000-8000-000000000002' and kind='reply'),0,'disabled reply preference suppresses the database notification');
update public.account_preferences set notification_preferences=notification_preferences||'{"replies":true}'::jsonb where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.comments(post_id,author_id,body) values ('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Preference enabled reply')$$,'member can comment when reply notifications are enabled');
reset role;
select is((select count(*)::int from public.notifications where user_id='10000000-0000-4000-8000-000000000002' and kind='reply'),1,'enabled reply preference receives one database notification');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select lives_ok($$insert into public.community_join_requests(community_id,requester_id) select id,'10000000-0000-4000-8000-000000000001' from public.communities where slug='rls-approval-community'$$,'player can request approval-based community access');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.respond_to_community_join_request((select r.id from public.community_join_requests r join public.communities c on c.id=r.community_id where c.slug='rls-approval-community' and r.requester_id='10000000-0000-4000-8000-000000000001'),true)$$,'community owner can approve a join request');
select is((select count(*)::int from public.community_members m join public.communities c on c.id=m.community_id where c.slug='rls-approval-community' and m.user_id='10000000-0000-4000-8000-000000000001'),1,'approved requester becomes a member');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select throws_ok($$insert into public.moderation_actions(moderator_id,subject_type,subject_id,action) values ('10000000-0000-4000-8000-000000000001','report','40000000-0000-4000-8000-000000000001','forged_audit')$$,'42501',null,'regular users cannot write moderation audit records');
select lives_ok($$update public.profiles set bio='Account A own edit' where id='10000000-0000-4000-8000-000000000001'$$,'account A can edit its own profile');

insert into public.user_games(user_id,game_id)
select '10000000-0000-4000-8000-000000000001',id from public.games where slug='rls-policy-fixture';
select is((select count(*)::int from public.user_games where user_id='10000000-0000-4000-8000-000000000001'),1,'account A can add a game to its own library');

select throws_ok(
  $$insert into public.user_games(user_id,game_id) select '10000000-0000-4000-8000-000000000002',id from public.games where slug='rls-policy-fixture'$$,
  '42501',null,'account A cannot add a game to account B library'
);

update public.profiles set bio='Cross-account edit' where id='10000000-0000-4000-8000-000000000002';
reset role;
select is((select bio from public.profiles where id='10000000-0000-4000-8000-000000000002'),'Private original','account A cannot change account B profile');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select throws_ok(
  $$insert into public.account_preferences(user_id) values ('10000000-0000-4000-8000-000000000002')$$,
  '42501',null,'account A cannot create account B private settings'
);
reset role;

delete from auth.users where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
delete from public.games where slug='rls-policy-fixture';
select * from finish();
rollback;

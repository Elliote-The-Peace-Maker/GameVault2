-- GameVault membership catalog and moderated community map layers.
-- This migration creates structures only. Prices and publishable offerings are
-- configured by the project owner; no memberships are activated from the client.

create table if not exists public.membership_plans (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  billing_interval text check (billing_interval is null or billing_interval in ('month','year','one_time')),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  provider_price_id text unique,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.membership_addons (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,47}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  price_cents integer check (price_cents is null or price_cents >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  billing_interval text check (billing_interval is null or billing_interval in ('month','year','one_time')),
  features jsonb not null default '[]'::jsonb check (jsonb_typeof(features) = 'array'),
  provider_price_id text unique,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.membership_plans(id) on delete restrict,
  provider text not null check (provider in ('stripe','manual')),
  provider_customer_id text,
  provider_subscription_id text unique,
  status text not null check (status in ('incomplete','trialing','active','past_due','canceled','unpaid','paused','expired')),
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create index if not exists user_memberships_owner_status_idx on public.user_memberships(user_id,status,current_period_end desc);

create table if not exists public.user_membership_addons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_id uuid not null,
  addon_id text not null references public.membership_addons(id) on delete restrict,
  provider_item_id text unique,
  status text not null check (status in ('active','canceled','expired')),
  created_at timestamptz not null default now(),
  foreign key (membership_id,user_id) references public.user_memberships(id,user_id) on delete cascade,
  unique (membership_id,addon_id)
);
create index if not exists user_membership_addons_owner_idx on public.user_membership_addons(user_id,status);

create table if not exists public.map_markers (
  id uuid primary key default gen_random_uuid(),
  map_key text not null check (map_key in ('gta-online-los-santos','gta-vi-leonida')),
  title text not null check (char_length(title) between 2 and 100),
  description text not null default '' check (char_length(description) <= 1200),
  category text not null check (category in ('activity','collectible','business','landmark','route','other')),
  x numeric(5,2) not null check (x between 0 and 100),
  y numeric(5,2) not null check (y between 0 and 100),
  source_note text not null default '' check (char_length(source_note) <= 300),
  status text not null default 'pending' check (status in ('pending','approved','rejected','removed')),
  submitted_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists map_markers_public_feed_idx on public.map_markers(map_key,status,created_at desc);
create index if not exists map_markers_submitter_idx on public.map_markers(submitted_by,created_at desc);

alter table public.membership_plans enable row level security;
alter table public.membership_addons enable row level security;
alter table public.user_memberships enable row level security;
alter table public.user_membership_addons enable row level security;
alter table public.map_markers enable row level security;

drop policy if exists "published plans are public" on public.membership_plans;
create policy "published plans are public" on public.membership_plans
  for select to anon,authenticated using (is_published or public.is_vexra_moderator());
drop policy if exists "moderators manage plans" on public.membership_plans;
create policy "moderators manage plans" on public.membership_plans
  for all to authenticated using (public.is_vexra_moderator()) with check (public.is_vexra_moderator());

drop policy if exists "published addons are public" on public.membership_addons;
create policy "published addons are public" on public.membership_addons
  for select to anon,authenticated using (is_published or public.is_vexra_moderator());
drop policy if exists "moderators manage addons" on public.membership_addons;
create policy "moderators manage addons" on public.membership_addons
  for all to authenticated using (public.is_vexra_moderator()) with check (public.is_vexra_moderator());

drop policy if exists "members read own membership" on public.user_memberships;
create policy "members read own membership" on public.user_memberships
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "members read own addons" on public.user_membership_addons;
create policy "members read own addons" on public.user_membership_addons
  for select to authenticated using (user_id = auth.uid());

-- Plans, renewals, cancellations, and addon grants must be written by a trusted
-- payment webhook/Edge Function. Browser clients receive read access only.
revoke all on public.user_memberships from anon, authenticated;
revoke all on public.user_membership_addons from anon, authenticated;
grant select on public.user_memberships, public.user_membership_addons to authenticated;
grant select on public.membership_plans, public.membership_addons to anon, authenticated;
grant insert, update, delete on public.membership_plans, public.membership_addons to authenticated;
grant select, insert, update, delete on public.map_markers to authenticated;
grant select on public.map_markers to anon;

drop policy if exists "approved map pins are visible" on public.map_markers;
create policy "approved map pins are visible" on public.map_markers
  for select to anon,authenticated using (
    status = 'approved' or submitted_by = auth.uid() or public.is_vexra_moderator()
  );
drop policy if exists "signed in members submit pending map pins" on public.map_markers;
create policy "signed in members submit pending map pins" on public.map_markers
  for insert to authenticated with check (submitted_by = auth.uid() and status = 'pending');
drop policy if exists "members edit their pending map pins" on public.map_markers;
create policy "members edit their pending map pins" on public.map_markers
  for update to authenticated using (submitted_by = auth.uid() and status = 'pending')
  with check (submitted_by = auth.uid() and status = 'pending');
drop policy if exists "members remove pending pins or moderators manage pins" on public.map_markers;
create policy "members remove pending pins or moderators manage pins" on public.map_markers
  for delete to authenticated using ((submitted_by = auth.uid() and status = 'pending') or public.is_vexra_moderator());
drop policy if exists "moderators review map pins" on public.map_markers;
create policy "moderators review map pins" on public.map_markers
  for update to authenticated using (public.is_vexra_moderator()) with check (public.is_vexra_moderator());

do $$
begin
  alter publication supabase_realtime add table public.map_markers;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
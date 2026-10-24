-- Allow future billing integrations to identify the processor that confirmed a membership.
-- This migration does not enable checkout or permit browser clients to modify memberships.
alter table public.user_memberships
  drop constraint if exists user_memberships_provider_check;

alter table public.user_memberships
  add constraint user_memberships_provider_check
  check (provider in ('stripe','paypal','crypto','manual'));

comment on column public.user_memberships.provider is
  'Processor that confirmed the membership; written only by trusted server-side billing code.';
-- Independent shared dealership notebook. No relationships to business tables.
create table public.deal_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null check (char_length(btrim(body)) between 1 and 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (title || ' ' || body) stored
);
create index deal_stories_updated_idx on public.deal_stories (updated_at desc, id desc);
alter table public.deal_stories enable row level security;
revoke all on public.deal_stories from public, anon, authenticated;
grant select, insert, update on public.deal_stories to authenticated;
-- This application is one shared dealership workspace, like customer_followups.
-- Exclude anonymous Auth sessions as well as signed-out API requests.
create policy deal_stories_read on public.deal_stories for select to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create policy deal_stories_create on public.deal_stories for insert to authenticated
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create policy deal_stories_edit on public.deal_stories for update to authenticated
using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false')
with check ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'), 'false') = 'false');
create function public.touch_deal_story() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_at := old.created_at;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.touch_deal_story() from public, anon, authenticated;
create trigger deal_story_updated before update on public.deal_stories
for each row execute function public.touch_deal_story();

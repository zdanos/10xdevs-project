-- migration: create profiles table
-- purpose: extend auth.users with user-specific data for flashcard ai including generation limits and activity tracking
-- affected tables: profiles (new)
-- references: auth.users (foreign key)
-- author: flashcard ai team
-- date: 2026-01-11

-- create profiles table as an extension of auth.users
-- this table stores additional user data including:
--   - generation quota tracking (generations_count, last_reset_date)
--   - activity timestamps for ux/analytics
-- the id matches auth.users.id for 1:1 relationship
create table public.profiles (
  -- primary key, references the supabase auth user id
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- quota management: tracks number of ai generations used in current 24h cycle
  -- resets to 0 when last_reset_date is more than 24 hours ago
  -- max allowed: 10 per day (enforced by check_and_reset_quota function)
  generations_count integer not null default 0,
  
  -- quota management: timestamp of the last quota reset
  -- used to implement "lazy reset" - reset happens on next generation attempt after 24h
  last_reset_date timestamptz not null default now(),
  
  -- ux/analytics: timestamp of the most recent ai generation
  -- used to show last activity in ui, nullable as new users haven't generated yet
  last_generation_date timestamptz,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ensure generations_count is never negative
  constraint generations_count_non_negative check (generations_count >= 0),
  
  -- ensure generations_count doesn't exceed daily limit
  -- note: this is a safety check; primary enforcement is in check_and_reset_quota()
  constraint generations_count_within_limit check (generations_count <= 10)
);

-- enable row level security on profiles table
-- this is mandatory for all public tables in supabase
alter table public.profiles enable row level security;

-- rls policy: users can view only their own profile
-- used when: fetching profile data, checking quota limits in ui
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- rls policy: users can update only their own profile
-- used when: updating activity timestamps, manual profile updates
-- note: quota updates are primarily handled by check_and_reset_quota() function
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- rls policy: allow insert for authenticated users creating their own profile
-- used when: new user registration (typically via trigger, but policy enables manual creation)
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- add table comment for documentation
comment on table public.profiles is 'User profiles extending auth.users with flashcard ai-specific data including generation quotas and activity tracking';

-- add column comments for clarity
comment on column public.profiles.generations_count is 'Number of AI generations used in current 24-hour cycle (max 10)';
comment on column public.profiles.last_reset_date is 'Timestamp of last quota reset, used for lazy 24-hour reset logic';
comment on column public.profiles.last_generation_date is 'Timestamp of most recent AI generation, for UX/analytics';

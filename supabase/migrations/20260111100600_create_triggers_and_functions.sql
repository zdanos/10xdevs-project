-- migration: create triggers and functions
-- purpose: implement business logic for user onboarding, quota management, and automatic timestamps
-- affected: profiles, decks, flashcards tables (triggers), auth.users (trigger)
-- functions: handle_new_user, check_and_reset_quota, handle_updated_at
-- author: flashcard ai team
-- date: 2026-01-11

-- ===== function 1: automatic profile creation =====

-- creates a profile record automatically when a new user signs up
-- this ensures every auth.users entry has a corresponding profiles entry
-- trigger: after insert on auth.users
-- security: runs with security definer (elevated privileges) to bypass rls
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- insert new profile record with user's id from auth.users
  -- all quota fields use defaults: generations_count=0, last_reset_date=now()
  insert into public.profiles (id)
  values (new.id);
  
  return new;
exception
  when others then
    -- log error but don't block user signup
    -- user can still authenticate, profile can be created manually later
    raise warning 'Failed to create profile for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

-- add comment explaining function purpose
comment on function public.handle_new_user is 'Trigger function: auto-creates profile when new user signs up in auth.users';

-- create trigger on auth.users table
-- fires after each user registration to create corresponding profile
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- note: cannot add comment on trigger attached to auth.users (insufficient permissions)
-- the function comment above documents the purpose

-- ===== function 2: quota management with lazy reset =====

-- manages the daily ai generation quota (10 generations per 24 hours)
-- implements "lazy reset" strategy: quota resets on first use after 24h, not on schedule
-- this function:
--   1. checks if 24h passed since last reset -> resets if needed
--   2. verifies user hasn't exceeded daily limit (10 generations)
--   3. increments generation counter
--   4. creates generation_log entry
--   5. updates last_generation_date
-- returns: generation_log id for linking flashcards to generation session
create or replace function public.check_and_reset_quota(
  p_generated_count integer
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_user_id uuid;
  v_current_count integer;
  v_last_reset timestamptz;
  v_generation_log_id uuid;
  v_hours_since_reset numeric;
begin
  -- get current user id from auth context
  v_user_id := auth.uid();
  
  -- ensure user is authenticated
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  
  -- validate input parameter
  if p_generated_count <= 0 then
    raise exception 'Generated count must be positive, got: %', p_generated_count;
  end if;
  
  -- fetch current quota state for user
  -- use for update to prevent race conditions from concurrent requests
  select 
    generations_count,
    last_reset_date
  into 
    v_current_count,
    v_last_reset
  from public.profiles
  where id = v_user_id
  for update;
  
  -- calculate hours since last reset
  v_hours_since_reset := extract(epoch from (now() - v_last_reset)) / 3600;
  
  -- lazy reset: if 24+ hours passed, reset the quota
  if v_hours_since_reset >= 24 then
    v_current_count := 0;
    v_last_reset := now();
    
    update public.profiles
    set 
      generations_count = 0,
      last_reset_date = now(),
      updated_at = now()
    where id = v_user_id;
  end if;
  
  -- check if user has quota available
  if v_current_count >= 10 then
    -- quota exceeded, raise descriptive error
    raise exception 'Daily generation limit reached (10/10). Quota resets in % hours.',
      round(24 - v_hours_since_reset, 1);
  end if;
  
  -- quota available: increment counter and update last generation timestamp
  update public.profiles
  set 
    generations_count = generations_count + 1,
    last_generation_date = now(),
    updated_at = now()
  where id = v_user_id;
  
  -- create generation log entry for analytics
  insert into public.generation_logs (user_id, generated_count)
  values (v_user_id, p_generated_count)
  returning id into v_generation_log_id;
  
  -- return generation log id for linking flashcards
  return v_generation_log_id;
  
exception
  when others then
    -- re-raise with context for debugging
    raise exception 'Quota check failed for user %: %', v_user_id, sqlerrm;
end;
$$;

-- add comment explaining function purpose and usage
comment on function public.check_and_reset_quota is 'RPC function: checks/resets daily quota (10 generations/24h) with lazy reset strategy. Returns generation_log id.';

-- ===== function 3: automatic updated_at timestamp =====

-- updates the updated_at column automatically on row modification
-- uses moddatetime extension for reliable timestamp management
-- trigger: before update on profiles, decks, flashcards
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- set updated_at to current timestamp
  new.updated_at = now();
  return new;
end;
$$;

-- add comment explaining function purpose
comment on function public.handle_updated_at is 'Trigger function: automatically updates updated_at timestamp on row modification';

-- create triggers for updated_at on all relevant tables

-- trigger for profiles table
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

comment on trigger profiles_updated_at on public.profiles is 'Automatically updates updated_at timestamp on profile modifications';

-- trigger for decks table
drop trigger if exists decks_updated_at on public.decks;
create trigger decks_updated_at
  before update on public.decks
  for each row
  execute function public.handle_updated_at();

comment on trigger decks_updated_at on public.decks is 'Automatically updates updated_at timestamp on deck modifications';

-- trigger for flashcards table
drop trigger if exists flashcards_updated_at on public.flashcards;
create trigger flashcards_updated_at
  before update on public.flashcards
  for each row
  execute function public.handle_updated_at();

comment on trigger flashcards_updated_at on public.flashcards is 'Automatically updates updated_at timestamp on flashcard modifications';

-- ===== usage notes =====

-- check_and_reset_quota usage from application:
-- 1. user initiates ai generation
-- 2. frontend calls: select check_and_reset_quota(5) -- 5 = number of cards ai will generate
-- 3. function returns generation_log_id
-- 4. frontend sends notes to ai endpoint
-- 5. ai generates flashcards
-- 6. user reviews and selects cards to save
-- 7. frontend saves selected cards with generation_id from step 3
-- 8. acceptance rate = count(saved cards with generation_id) / 5

-- quota reset timing:
-- - resets automatically 24 hours after last reset, not at midnight
-- - example: first generation at 2pm monday -> quota resets at 2pm tuesday
-- - this "rolling window" approach is simpler and fairer than calendar-day reset

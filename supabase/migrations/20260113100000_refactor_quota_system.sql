-- migration: refactor quota system into check and record operations
-- purpose: separate quota checking from quota consumption for better data consistency
-- affected: check_and_reset_quota (removed), check_quota (new), record_generation (new)
-- author: flashcard ai team
-- date: 2026-01-13

-- ===== remove old combined function =====

DROP FUNCTION IF EXISTS public.check_and_reset_quota(integer);

-- ===== function 1: check_quota =====
-- checks if user has available quota and performs lazy reset if needed
-- this function has no side effects on quota counter - it only checks and resets the timer
-- returns quota information for display purposes

create or replace function public.check_quota()
returns json
language plpgsql
security invoker
as $$
declare
  v_user_id uuid;
  v_current_count integer;
  v_last_reset timestamptz;
  v_hours_since_reset numeric;
  v_can_generate boolean;
  v_quota_remaining integer;
begin
  -- get current user id from auth context
  v_user_id := auth.uid();
  
  -- ensure user is authenticated
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  
  -- fetch current quota state for user
  select 
    generations_count,
    last_reset_date
  into 
    v_current_count,
    v_last_reset
  from public.profiles
  where id = v_user_id;
  
  -- if profile not found, raise error
  if not found then
    raise exception 'User profile not found';
  end if;
  
  -- calculate hours since last reset
  v_hours_since_reset := extract(epoch from (now() - v_last_reset)) / 3600;
  
  -- lazy reset: if 24+ hours passed, reset the quota
  if v_hours_since_reset >= 24 then
    update public.profiles
    set 
      generations_count = 0,
      last_reset_date = now(),
      updated_at = now()
    where id = v_user_id;
    
    v_current_count := 0;
  end if;
  
  -- determine if user can generate
  v_can_generate := v_current_count < 10;
  v_quota_remaining := 10 - v_current_count;
  
  -- return quota status
  return json_build_object(
    'can_generate', v_can_generate,
    'quota_remaining', v_quota_remaining,
    'current_count', v_current_count,
    'hours_until_reset', case 
      when v_hours_since_reset >= 24 then 24.0
      else round((24 - v_hours_since_reset)::numeric, 1)
    end
  );
  
exception
  when others then
    raise exception 'Quota check failed for user %: %', v_user_id, sqlerrm;
end;
$$;

comment on function public.check_quota is 
  'RPC function: checks if user has available quota (10 generations/24h) and performs lazy reset if needed. Does not consume quota.';

-- ===== function 2: record_generation =====
-- records a successful generation by updating quota and creating generation log
-- uses optimistic locking to handle race conditions
-- only succeeds if user still has quota available at the time of recording

create or replace function public.record_generation(
  p_generated_count integer
)
returns json
language plpgsql
security invoker
as $$
declare
  v_user_id uuid;
  v_generation_log_id uuid;
  v_new_count integer;
  v_quota_remaining integer;
  v_last_reset timestamptz;
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
  
  -- get current state for reset calculation
  select last_reset_date
  into v_last_reset
  from public.profiles
  where id = v_user_id;
  
  if not found then
    raise exception 'User profile not found';
  end if;
  
  -- calculate hours since last reset for error message
  v_hours_since_reset := extract(epoch from (now() - v_last_reset)) / 3600;
  
  -- update quota with optimistic locking (revalidate quota during update)
  -- this handles race conditions where multiple requests complete simultaneously
  update public.profiles
  set 
    generations_count = generations_count + 1,
    last_generation_date = now(),
    updated_at = now()
  where id = v_user_id
    and generations_count < 10  -- optimistic lock: revalidate quota
  returning generations_count into v_new_count;
  
  -- check if update succeeded
  if not found then
    -- quota was exceeded between check and record (race condition)
    raise exception 'Daily generation limit reached (10/10). Quota resets in % hours.',
      round(24 - v_hours_since_reset, 1);
  end if;
  
  -- create generation log entry for analytics
  insert into public.generation_logs (user_id, generated_count)
  values (v_user_id, p_generated_count)
  returning id into v_generation_log_id;
  
  -- calculate remaining quota
  v_quota_remaining := 10 - v_new_count;
  
  -- return generation log id and updated quota
  return json_build_object(
    'generation_log_id', v_generation_log_id,
    'generations_count', v_new_count,
    'quota_remaining', v_quota_remaining
  );
  
exception
  when others then
    raise exception 'Failed to record generation for user %: %', v_user_id, sqlerrm;
end;
$$;

comment on function public.record_generation is 
  'RPC function: records successful generation by incrementing quota counter and creating generation log. Uses optimistic locking to handle race conditions.';

-- ===== usage notes =====

-- new workflow:
-- 1. call check_quota() to verify user has available quota
-- 2. if can_generate = true, proceed with AI generation
-- 3. after successful generation, call record_generation(actual_count)
-- 4. if record_generation fails due to race condition, user still gets flashcards but sees quota exceeded error
-- 5. generation_logs now contains accurate counts of actually generated flashcards

-- benefits:
-- - quota only consumed on successful generation
-- - accurate data in generation_logs
-- - fair to users (no quota loss on system failures)
-- - handles race conditions gracefully with optimistic locking

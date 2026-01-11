-- migration: create flashcards table
-- purpose: main table storing flashcard content and supermemo 2 (sm-2) algorithm state
-- affected tables: flashcards (new)
-- references: decks (foreign key), profiles (foreign key), generation_logs (optional foreign key)
-- algorithm: implements supermemo 2 spaced repetition algorithm fields
-- author: flashcard ai team
-- date: 2026-01-11

-- create flashcards table
-- this is the core table of the application, storing:
--   1. flashcard content (front/back text)
--   2. sm-2 algorithm state (repetition_number, easiness_factor, interval, next_review_date)
--   3. metadata (source, ownership, timestamps)
--   4. optional link to generation session (for acceptance rate analytics)
--
-- sm-2 algorithm overview:
--   - repetition_number (n): count of successful reviews
--   - easiness_factor (ef): difficulty rating (2.5 is default, higher = easier)
--   - interval (i): days until next review
--   - next_review_date: when card should be reviewed again
create table public.flashcards (
  -- primary key: unique identifier for each flashcard
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key: deck containing this flashcard
  -- cascade delete: when deck is deleted, all its flashcards are removed
  deck_id uuid not null references public.decks(id) on delete cascade,
  
  -- foreign key: owner of the flashcard
  -- denormalized for rls performance - avoids join through decks table
  -- must match the user_id of the parent deck (enforced by application logic)
  user_id uuid not null references public.profiles(id),
  
  -- flashcard content: question/prompt shown to user
  -- character limit: 200 (enforced for mvp simplicity and ui consistency)
  front varchar(200) not null,
  
  -- flashcard content: answer/explanation shown after user responds
  -- character limit: 500 (allows more detailed answers than questions)
  back varchar(500) not null,
  
  -- metadata: tracks how this flashcard was created
  -- values: 'AI' (generated, not edited), 'EditedAI' (generated then edited), 'Manual' (user-created)
  -- used for analytics to measure ai generation quality
  creation_source card_source_type not null default 'Manual',
  
  -- optional foreign key: links to generation session that created this card
  -- nullable: manual cards have no generation_id
  -- set null on delete: preserve flashcard even if generation log is deleted
  -- used for acceptance rate calculation: count(flashcards per generation_id) / generated_count
  generation_id uuid references public.generation_logs(id) on delete set null,
  
  -- ===== supermemo 2 (sm-2) algorithm fields =====
  
  -- sm-2: number of consecutive successful reviews (n)
  -- starts at 0 for new cards, increments on each successful review
  -- resets to 0 if user fails a review
  repetition_number integer not null default 0,
  
  -- sm-2: easiness factor (ef)
  -- represents perceived difficulty: higher = easier
  -- default: 2.5 (standard sm-2 starting value)
  -- adjusted after each review based on user's quality rating
  -- typically ranges from 1.3 to 2.5
  easiness_factor float not null default 2.5,
  
  -- sm-2: interval in days until next review (i)
  -- starts at 0 for new cards (review immediately)
  -- calculated by sm-2 algorithm after each review
  -- grows exponentially for successful reviews
  interval integer not null default 0,
  
  -- sm-2: timestamp when card should be reviewed next
  -- cards with next_review_date <= now() are "due" and shown in study mode
  -- default: now() (new cards are immediately available for first review)
  -- updated after each review based on sm-2 calculations
  next_review_date timestamptz not null default now(),
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ensure flashcard content is not empty
  constraint front_not_empty check (trim(front) <> ''),
  constraint back_not_empty check (trim(back) <> ''),
  
  -- ensure sm-2 values are within valid ranges
  constraint repetition_number_non_negative check (repetition_number >= 0),
  constraint easiness_factor_valid_range check (easiness_factor >= 1.3 and easiness_factor <= 2.5),
  constraint interval_non_negative check (interval >= 0)
);

-- enable row level security on flashcards table
-- this is mandatory for all public tables in supabase
alter table public.flashcards enable row level security;

-- rls policy: authenticated users can view only their own flashcards
-- used when: listing flashcards in deck view, fetching due cards for study mode
create policy "flashcards_select_own"
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- rls policy: authenticated users can insert flashcards for themselves
-- used when: saving ai-generated cards, creating manual flashcards
create policy "flashcards_insert_own"
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- rls policy: authenticated users can update only their own flashcards
-- used when: editing card content, updating sm-2 state after review
create policy "flashcards_update_own"
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rls policy: authenticated users can delete only their own flashcards
-- used when: removing unwanted flashcards
-- warning: this is a destructive operation, consider soft delete for production
create policy "flashcards_delete_own"
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- add table comment for documentation
comment on table public.flashcards is 'Main flashcard table with content, SM-2 algorithm state, and metadata for spaced repetition learning';

-- add column comments for clarity
comment on column public.flashcards.user_id is 'Owner of flashcard (denormalized from deck for RLS performance)';
comment on column public.flashcards.front is 'Question/prompt text (max 200 chars)';
comment on column public.flashcards.back is 'Answer/explanation text (max 500 chars)';
comment on column public.flashcards.creation_source is 'Origin: AI-generated, AI-edited, or manually created';
comment on column public.flashcards.generation_id is 'Optional link to generation session for acceptance rate analytics';
comment on column public.flashcards.repetition_number is 'SM-2: count of consecutive successful reviews';
comment on column public.flashcards.easiness_factor is 'SM-2: difficulty factor (1.3-2.5, higher = easier)';
comment on column public.flashcards.interval is 'SM-2: days until next review';
comment on column public.flashcards.next_review_date is 'SM-2: timestamp when card is due for review';

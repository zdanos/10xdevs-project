-- migration: create performance indexes
-- purpose: optimize query performance for common access patterns in flashcard ai
-- affected tables: flashcards, decks, generation_logs
-- performance focus: study mode queries, deck filtering, rls checks, analytics
-- author: flashcard ai team
-- date: 2026-01-11

-- ===== flashcards table indexes =====

-- composite index for study mode query (most critical query in the app)
-- query pattern: fetch due cards for specific user/deck
-- example: select * from flashcards where user_id = $1 and deck_id = $2 and next_review_date <= now()
-- this index supports:
--   1. rls filtering by user_id (first column for security)
--   2. deck filtering (second column for deck-specific study)
--   3. due card filtering by next_review_date (third column for date range)
-- ordered by selectivity: user_id (many rows) -> deck_id (fewer rows) -> next_review_date (specific rows)
create index flashcards_study_idx 
  on public.flashcards (user_id, deck_id, next_review_date);

-- comment explaining the index purpose
comment on index flashcards_study_idx is 'Optimizes study mode query: fetch due cards for user/deck';

-- index for deck filtering operations
-- query pattern: fetch all flashcards in a deck (for deck management view)
-- example: select * from flashcards where deck_id = $1
-- also speeds up cascade deletes when a deck is removed
create index flashcards_deck_id_idx 
  on public.flashcards (deck_id);

comment on index flashcards_deck_id_idx is 'Optimizes deck-based queries and cascade delete operations';

-- ===== decks table indexes =====

-- index for user's deck listing
-- query pattern: fetch all decks for a user (for deck selector, dashboard)
-- example: select * from decks where user_id = $1 order by created_at desc
-- critical for rls performance and deck listing
create index decks_user_id_idx 
  on public.decks (user_id);

comment on index decks_user_id_idx is 'Optimizes user deck listing and RLS filtering';

-- ===== generation_logs table indexes =====

-- index for generation history queries
-- query pattern: fetch generation history for a user (for analytics, usage stats)
-- example: select * from generation_logs where user_id = $1 order by created_at desc
-- used for: user analytics, acceptance rate calculation, generation history
create index generation_logs_user_id_idx 
  on public.generation_logs (user_id);

comment on index generation_logs_user_id_idx is 'Optimizes user generation history queries and analytics';

-- composite index for acceptance rate calculation
-- query pattern: count accepted flashcards per generation session
-- example: select generation_id, count(*) from flashcards where generation_id = $1 group by generation_id
-- this enables efficient acceptance rate analytics
create index flashcards_generation_id_idx 
  on public.flashcards (generation_id)
  where generation_id is not null;

comment on index flashcards_generation_id_idx is 'Optimizes acceptance rate calculation (partial index for AI-generated cards only)';

-- note on index maintenance:
-- postgresql automatically maintains indexes on:
--   - primary keys (id columns)
--   - foreign keys are NOT automatically indexed but covered above
-- monitor index usage with: select * from pg_stat_user_indexes where schemaname = 'public'

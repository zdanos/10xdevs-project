-- migration: enable RLS and restore security policies
-- purpose: re-enable row level security and restore all policies for profiles, decks, generation_logs, and flashcards tables
-- affected tables: profiles, decks, generation_logs, flashcards
-- author: flashcard ai team
-- date: 2026-01-21
-- notes: this migration reverts 20260111100700_disable_all_policies.sql

-- ===== enable RLS on all tables =====

-- enable row level security on profiles table
alter table public.profiles enable row level security;

-- enable row level security on decks table
alter table public.decks enable row level security;

-- enable row level security on generation_logs table
alter table public.generation_logs enable row level security;

-- enable row level security on flashcards table
alter table public.flashcards enable row level security;

-- ===== profiles table policies =====

-- policy: allow authenticated users to select their own profile
-- rationale: users should only be able to view their own profile data
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- policy: allow authenticated users to insert their own profile
-- rationale: users should only be able to create their own profile record
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

-- policy: allow authenticated users to update their own profile
-- rationale: users should only be able to modify their own profile data
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ===== decks table policies =====

-- policy: allow authenticated users to select their own decks
-- rationale: users should only be able to view decks they created
create policy "decks_select_own"
  on public.decks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: allow authenticated users to insert their own decks
-- rationale: users should only be able to create decks for themselves
create policy "decks_insert_own"
  on public.decks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to update their own decks
-- rationale: users should only be able to modify decks they created
create policy "decks_update_own"
  on public.decks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: allow authenticated users to delete their own decks
-- rationale: users should only be able to delete decks they created
create policy "decks_delete_own"
  on public.decks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ===== generation_logs table policies =====

-- policy: allow authenticated users to select their own generation logs
-- rationale: users should only be able to view their own AI generation history
create policy "generation_logs_select_own"
  on public.generation_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: allow authenticated users to insert their own generation logs
-- rationale: users should only be able to create generation logs for themselves
create policy "generation_logs_insert_own"
  on public.generation_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ===== flashcards table policies =====

-- policy: allow authenticated users to select flashcards from their own decks
-- rationale: users should only be able to view flashcards in decks they own
create policy "flashcards_select_own"
  on public.flashcards
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

-- policy: allow authenticated users to insert flashcards into their own decks
-- rationale: users should only be able to create flashcards in decks they own
create policy "flashcards_insert_own"
  on public.flashcards
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

-- policy: allow authenticated users to update flashcards in their own decks
-- rationale: users should only be able to modify flashcards in decks they own
create policy "flashcards_update_own"
  on public.flashcards
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

-- policy: allow authenticated users to delete flashcards from their own decks
-- rationale: users should only be able to delete flashcards in decks they own
create policy "flashcards_delete_own"
  on public.flashcards
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.decks
      where decks.id = flashcards.deck_id
        and decks.user_id = auth.uid()
    )
  );

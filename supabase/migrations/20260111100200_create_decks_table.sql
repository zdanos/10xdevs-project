-- migration: create decks table
-- purpose: create organizational containers (decks) for grouping flashcards by topic or subject
-- affected tables: decks (new)
-- references: profiles (foreign key)
-- author: flashcard ai team
-- date: 2026-01-11

-- create decks table
-- decks are user-owned containers that organize flashcards into logical groups
-- examples: "Spanish Vocabulary", "Biology Chapter 3", "AWS Certification Terms"
create table public.decks (
  -- primary key: unique identifier for each deck
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key: owner of the deck
  -- cascade delete: when user/profile is deleted, all their decks are removed
  user_id uuid not null references public.profiles(id) on delete cascade,
  
  -- deck name/title entered by user
  -- no length limit to allow descriptive names
  name text not null,
  
  -- audit timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- ensure deck name is not empty or just whitespace
  constraint deck_name_not_empty check (trim(name) <> '')
);

-- enable row level security on decks table
-- this is mandatory for all public tables in supabase
alter table public.decks enable row level security;

-- rls policy: authenticated users can view only their own decks
-- used when: listing decks in deck selector, showing deck details
create policy "decks_select_own"
  on public.decks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- rls policy: authenticated users can insert decks for themselves
-- used when: creating a new deck
create policy "decks_insert_own"
  on public.decks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- rls policy: authenticated users can update only their own decks
-- used when: renaming a deck, updating deck metadata
create policy "decks_update_own"
  on public.decks
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- rls policy: authenticated users can delete only their own decks
-- used when: removing a deck (cascade deletes all contained flashcards)
-- warning: this is a destructive operation
create policy "decks_delete_own"
  on public.decks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- add table comment for documentation
comment on table public.decks is 'Organizational containers for grouping flashcards by topic, subject, or category';

-- add column comments for clarity
comment on column public.decks.user_id is 'Owner of the deck, references profiles table';
comment on column public.decks.name is 'User-defined name/title for the deck';

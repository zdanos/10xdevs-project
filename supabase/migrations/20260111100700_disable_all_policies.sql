-- migration: disable all RLS policies
-- purpose: remove all row level security policies from profiles, decks, generation_logs, and flashcards tables
-- affected tables: profiles, decks, generation_logs, flashcards
-- author: flashcard ai team
-- date: 2026-01-11

-- ===== profiles table policies =====

-- drop select policy
drop policy if exists "profiles_select_own" on public.profiles;

-- drop update policy
drop policy if exists "profiles_update_own" on public.profiles;

-- drop insert policy
drop policy if exists "profiles_insert_own" on public.profiles;

-- ===== decks table policies =====

-- drop select policy
drop policy if exists "decks_select_own" on public.decks;

-- drop insert policy
drop policy if exists "decks_insert_own" on public.decks;

-- drop update policy
drop policy if exists "decks_update_own" on public.decks;

-- drop delete policy
drop policy if exists "decks_delete_own" on public.decks;

-- ===== generation_logs table policies =====

-- drop select policy
drop policy if exists "generation_logs_select_own" on public.generation_logs;

-- drop insert policy
drop policy if exists "generation_logs_insert_own" on public.generation_logs;

-- ===== flashcards table policies =====

-- drop select policy
drop policy if exists "flashcards_select_own" on public.flashcards;

-- drop insert policy
drop policy if exists "flashcards_insert_own" on public.flashcards;

-- drop update policy
drop policy if exists "flashcards_update_own" on public.flashcards;

-- drop delete policy
drop policy if exists "flashcards_delete_own" on public.flashcards;

-- ===== disable RLS entirely on all tables =====

-- disable row level security on profiles table
alter table public.profiles disable row level security;

-- disable row level security on decks table
alter table public.decks disable row level security;

-- disable row level security on generation_logs table
alter table public.generation_logs disable row level security;

-- disable row level security on flashcards table
alter table public.flashcards disable row level security;
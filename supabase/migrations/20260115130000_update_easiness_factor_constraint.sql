-- migration: update easiness_factor constraint
-- purpose: fix constraint violation when SM-2 algorithm increases EF above 2.5
-- affected tables: flashcards
-- issue: original constraint limited EF to 2.5, but SM-2 algorithm allows it to grow beyond that
-- solution: increase maximum to 4.0 to accommodate very easy cards
-- author: flashcard ai team
-- date: 2026-01-15

-- background: supermemo 2 (sm-2) algorithm behavior
-- - minimum ef: 1.3 (enforced by algorithm, prevents excessive repetition)
-- - initial ef: 2.5 (default starting value for new cards)
-- - ef adjustment: increases by ~0.1 with grade 5 (easy), decreases with lower grades
-- - practical range: typically 1.3 to 3.0, but can grow higher with consistent easy ratings
-- - our limit: 4.0 provides headroom for edge cases while preventing unrealistic values

-- step 1: drop the old constraint
alter table public.flashcards
  drop constraint easiness_factor_valid_range;

-- step 2: add the new constraint with expanded range
-- minimum: 1.3 (standard sm-2 lower bound, unchanged)
-- maximum: 4.0 (allows for very easy cards while preventing unrealistic values)
alter table public.flashcards
  add constraint easiness_factor_valid_range 
  check (easiness_factor >= 1.3 and easiness_factor <= 4.0);

-- update column comment to reflect new range
comment on column public.flashcards.easiness_factor is 'SM-2: difficulty factor (1.3-4.0, higher = easier)';

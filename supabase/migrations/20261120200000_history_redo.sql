-- What an undo overwrote, saved when Undo is pressed, so the pantry app's Revert can put the change back.
-- Null for entries that were never undone, or were undone before this column existed.
alter table public.history add column if not exists redo jsonb;

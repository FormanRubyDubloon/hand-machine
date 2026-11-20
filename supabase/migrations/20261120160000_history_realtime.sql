-- Collca on the web listens for Claude's changes and pulls them straight away, instead of waiting for
-- Sync. Every change Claude makes writes a History row (who = 'claude'), so History is the one table
-- Realtime needs to watch. Realtime applies the "own rows" rule, so each account only hears its own.
alter publication supabase_realtime add table public.history;

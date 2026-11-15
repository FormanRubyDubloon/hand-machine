-- When a recipe's content was last changed, so the pantry app can sort recipes by date edited.
-- Existing recipes start with the date they were added.
alter table public.recipes add column edited_at timestamptz not null default now();
update public.recipes set edited_at = added_at;

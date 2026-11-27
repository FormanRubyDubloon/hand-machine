-- Facts for Insights (claude/insights-plan.md): what a History entry means in numbers, as a list of
-- { kind: bought | used | threw | cooked, itemId, qty, pence, estimate, storeId, shopId, recipeId }.
-- Null for entries that don't count (edits, settings) and for everything written before this column.
alter table public.history add column if not exists facts jsonb;

-- Insights reads a year of these, more than the apps keep locally (they fetch the newest 500 entries).
create index if not exists history_owner_at_facts on public.history (owner_id, at) where facts is not null;

-- New items from recipes (REC-10). An ingredient the pantry doesn't have becomes a pantry item when the user
-- puts it on the shopping list, and shows as New in the pantry app until some is bought.
--
-- needs_review: the "New" flag. Cleared when stock goes above 0.
-- from_recipe_id / from_ingredient_position: added for an earlier design (a one-off that became an item at the
--   phone's sync). Not used; they can be dropped. So can the columns added to list_entries by 20261115120000.

alter table public.items
  add column needs_review boolean not null default false,
  add column from_recipe_id text,
  add column from_ingredient_position int;

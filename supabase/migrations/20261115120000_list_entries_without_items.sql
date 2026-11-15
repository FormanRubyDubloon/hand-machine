-- List entries for ingredients that aren't in the pantry yet (REC-10, "New" ingredients).
--
-- Until now every entry belonged to an item. A recipe ingredient the pantry has never had (parsley)
-- must be able to sit on the shopping list on its own, and only become a pantry item when it's ticked
-- off on the phone and the phone syncs. So an entry can now have no item and carry its own name, a
-- guessed category and the recipe ingredient it came from.
--
-- Additive only: existing rows and the code that's running now keep working. Nothing reads the new
-- columns yet. The app changes that use them are a second pass (see the pantry handoff).
--
-- Not covered here: the shape the app reads. `list_entries(...)` is embedded under `items`, so entries
-- with no item won't come back that way. They'll need their own select when the code is written.

alter table public.list_entries alter column item_id drop not null;

alter table public.list_entries
  add column name text,                                                          -- the ingredient's name, when there's no item
  add column category_id text references public.categories (id) on delete set null,  -- guessed, may be null
  add column ingredient_recipe_id text,                                          -- the recipe ingredient it came from: recipe_ingredients has no id of its own,
  add column ingredient_position int;                                            -- so it's (recipe_id, position)

-- An entry is either on an item, or it names itself.
alter table public.list_entries
  add constraint list_entries_item_or_name check (item_id is not null or name is not null);

create index list_entries_ingredient_idx on public.list_entries (ingredient_recipe_id, ingredient_position) where ingredient_recipe_id is not null;

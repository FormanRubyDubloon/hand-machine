-- Lets a signed-in user add, change and delete recipes and their ingredients, so the pantry app's
-- Sync can send them. Same rule as items, categories and stores: anyone can read, only a signed-in
-- user can write, and sign-ups are off (see 20261114140000_auth_and_item_writes.sql).

create policy "add recipes" on public.recipes for insert to authenticated with check (true);
create policy "change recipes" on public.recipes for update to authenticated using (true) with check (true);
create policy "delete recipes" on public.recipes for delete to authenticated using (true);

create policy "add recipe ingredients" on public.recipe_ingredients for insert to authenticated with check (true);
create policy "change recipe ingredients" on public.recipe_ingredients for update to authenticated using (true) with check (true);
create policy "delete recipe ingredients" on public.recipe_ingredients for delete to authenticated using (true);

-- Notion's recipes say nothing about how much of an item a line uses, so the apps have treated every
-- linked ingredient as "partial" (any stock will do) when they load it. Store that, so the loader
-- can stop guessing and a recipe saved with a real count keeps it.
update public.recipe_ingredients set partial = true where item_id is not null and not partial;

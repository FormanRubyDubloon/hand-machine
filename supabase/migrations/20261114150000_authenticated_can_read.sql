-- The read policies were written `to anon`. Once someone signs in, the client sends their session
-- instead of the public key, so Postgres treats them as `authenticated`, which had no read policy:
-- the pantry came back empty and an upsert (which reads the row it conflicts with) was refused.
-- Signed-in users get the same read access as everyone else.

create policy "signed-in read categories" on public.categories for select to authenticated using (true);
create policy "signed-in read items" on public.items for select to authenticated using (true);
create policy "signed-in read recipes" on public.recipes for select to authenticated using (true);
create policy "signed-in read recipe ingredients" on public.recipe_ingredients for select to authenticated using (true);

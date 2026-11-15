-- Lets a signed-in user add, rename and remove categories, so the pantry app's Sync can send them
-- (Settings > Categories). Same rule as the item policies in 20261114140000_auth_and_item_writes.sql:
-- anyone can read, only someone with a Supabase Auth session can write, and sign-ups are off.
--
-- A category that items still point to can't be deleted (items.category_id references it). The app
-- moves the items first, and Sync deletes categories only after it has sent the items.

create policy "add categories" on public.categories for insert to authenticated with check (true);
create policy "change categories" on public.categories for update to authenticated using (true) with check (true);
create policy "delete categories" on public.categories for delete to authenticated using (true);

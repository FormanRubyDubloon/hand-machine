-- Lets a signed-in user write the pantry items, and stores the two item fields the app keeps
-- that had no column yet.
--
-- Anyone can still READ (the prototypes load the pantry before sign-in). WRITING needs a Supabase
-- Auth session. Public sign-ups are switched off in supabase/config.toml ([auth.email]
-- enable_signup = false), so the only people with a session are users created by hand in the
-- dashboard. If sign-ups were ever turned on, every one of them could write: re-check these
-- policies first.

alter table public.items
  add column entries jsonb not null default '[]',        -- shopping-list entries: [{source, qty, at}]
  add column opened_at date[] not null default '{}';     -- bulk: when each open pack was opened

create policy "add items" on public.items for insert to authenticated with check (true);
create policy "change items" on public.items for update to authenticated using (true) with check (true);
create policy "delete items" on public.items for delete to authenticated using (true);

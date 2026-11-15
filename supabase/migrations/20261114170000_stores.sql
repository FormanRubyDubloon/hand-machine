-- Stores and their aisle numbers, so the pantry app's Sync can share them (Settings > Stores and
-- aisles). Mirrors SharedStore in prototypes/shared/src/pantry.ts: one row per store, and one
-- store_aisles row per category the store gives a number (no row = not sold there).
--
-- Which store is the default stays on each device, so the phone can default to a different shop.
--
-- Deleting a store or a category takes its aisle numbers with it (on delete cascade), so removing
-- a category is never blocked by a store that numbered it.
--
-- Access is the same as items and categories: anyone can read, only a signed-in user can write,
-- and sign-ups are off (see 20261114140000_auth_and_item_writes.sql).

create table public.stores (
  id text primary key,
  name text not null,
  kind text,
  place text,
  sort int not null default 0
);

create table public.store_aisles (
  store_id text not null references public.stores (id) on delete cascade,
  category_id text not null references public.categories (id) on delete cascade,
  number int not null check (number > 0),
  primary key (store_id, category_id)
);

alter table public.stores enable row level security;
alter table public.store_aisles enable row level security;

create policy "read stores" on public.stores for select to anon, authenticated using (true);
create policy "add stores" on public.stores for insert to authenticated with check (true);
create policy "change stores" on public.stores for update to authenticated using (true) with check (true);
create policy "delete stores" on public.stores for delete to authenticated using (true);

create policy "read store aisles" on public.store_aisles for select to anon, authenticated using (true);
create policy "add store aisles" on public.store_aisles for insert to authenticated with check (true);
create policy "change store aisles" on public.store_aisles for update to authenticated using (true) with check (true);
create policy "delete store aisles" on public.store_aisles for delete to authenticated using (true);

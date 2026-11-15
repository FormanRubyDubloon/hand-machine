-- The shopping list's hand-added and recipe entries, and the pantry app's History, as tables.
--
-- list_entries: until now these were a jsonb array on items.entries. Each entry is one row, so the
-- list can be read and changed without rewriting the item. The array's data is copied across and the
-- column dropped. `position` keeps the order (entries are settled oldest first).
--
-- history: the pantry app's History, which lived only in that browser's localStorage. `undo` holds the
-- snapshot that puts things back, as jsonb. History shows what was bought and used, so unlike items
-- it is NOT readable with the public key: a signed-in user only.
--
-- Same writing rule as everything else: sign-ups are off (see 20261114140000_auth_and_item_writes.sql).

create table public.list_entries (
  id bigint generated always as identity primary key,
  item_id text not null references public.items (id) on delete cascade,
  position int not null default 0,
  kind text not null check (kind in ('hand', 'claude', 'recipe')),
  recipe text,                                  -- the recipe's name, when kind = 'recipe'
  qty numeric not null check (qty > 0),
  at timestamptz
);

create index list_entries_item_idx on public.list_entries (item_id, position);

insert into public.list_entries (item_id, position, kind, recipe, qty, at)
select i.id, e.n - 1, e.v #>> '{source,kind}', e.v #>> '{source,recipe}', (e.v ->> 'qty')::numeric, (e.v ->> 'at')::timestamptz
from public.items i, jsonb_array_elements(i.entries) with ordinality as e(v, n)
where e.v #>> '{source,kind}' in ('hand', 'claude', 'recipe') and (e.v ->> 'qty')::numeric > 0;

alter table public.items drop column entries;

alter table public.list_entries enable row level security;
create policy "read list entries" on public.list_entries for select to anon, authenticated using (true);
create policy "add list entries" on public.list_entries for insert to authenticated with check (true);
create policy "change list entries" on public.list_entries for update to authenticated using (true) with check (true);
create policy "delete list entries" on public.list_entries for delete to authenticated using (true);

create table public.history (
  id text primary key,
  at timestamptz not null,
  who text not null check (who in ('you', 'claude', 'phone')),
  title text not null,
  detail text,
  item_ids text[] not null default '{}',        -- not a foreign key: an entry outlives the item it names
  recipe_id text,
  undo jsonb,                                   -- what things looked like before; null = can't be undone
  undone boolean not null default false,
  key text                                      -- consecutive changes with one key merge (stepper taps)
);

create index history_at_idx on public.history (at desc);

alter table public.history enable row level security;
create policy "read history" on public.history for select to authenticated using (true);
create policy "add history" on public.history for insert to authenticated with check (true);
create policy "change history" on public.history for update to authenticated using (true) with check (true);
create policy "delete history" on public.history for delete to authenticated using (true);

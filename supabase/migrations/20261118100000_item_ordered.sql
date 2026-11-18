-- An item on the shopping list that's been ordered (online, or from someone else), so it isn't
-- bought again in a shop. It stays on the list, marked, and clears by itself once the item is no
-- longer needed.
alter table public.items
  add column if not exists ordered boolean not null default false;

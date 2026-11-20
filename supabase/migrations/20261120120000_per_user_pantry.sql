-- Each account gets its own pantry. Until now every signed-in account read and wrote the same rows (and
-- signed-out visitors could read most of them), which is why sign-ups were off.
--
-- Every table gains owner_id: the account the row belongs to. It defaults to whoever is signed in, so the
-- apps and the Claude connection never send it. Keys become (owner_id, id), so two accounts can both have
-- an item called "eggs", and the links between tables carry the owner too. The only rule left on each
-- table is "your own rows": nothing is readable signed out.
--
-- All the existing rows belong to the one account that exists today. The migration stops if there isn't
-- exactly one, rather than guess. Taken a backup first (backups/, not in git).

do $$
declare
  n int;
begin
  select count(*) into n from auth.users;
  if n <> 1 then
    raise exception 'Expected exactly one account to own the existing pantry, found %', n;
  end if;
end $$;

-- ---------- owner_id on every table, filled with the one account ----------

do $$
declare
  t text;
  owner uuid := (select id from auth.users);
begin
  foreach t in array array['categories', 'items', 'recipes', 'recipe_ingredients', 'stores', 'store_aisles', 'list_entries', 'history'] loop
    execute format('alter table public.%I add column owner_id uuid references auth.users (id) on delete cascade', t);
    execute format('update public.%I set owner_id = %L', t, owner);
    execute format('alter table public.%I alter column owner_id set not null, alter column owner_id set default auth.uid()', t);
  end loop;
end $$;

-- ---------- links: drop the old single-column ones ----------

alter table public.items drop constraint items_category_id_fkey;
alter table public.recipe_ingredients drop constraint recipe_ingredients_recipe_id_fkey;
alter table public.recipe_ingredients drop constraint recipe_ingredients_item_id_fkey;
alter table public.store_aisles drop constraint store_aisles_store_id_fkey;
alter table public.store_aisles drop constraint store_aisles_category_id_fkey;
alter table public.list_entries drop constraint list_entries_item_id_fkey;
alter table public.list_entries drop constraint list_entries_category_id_fkey;

-- ---------- keys and unique names, per owner ----------

alter table public.categories drop constraint categories_pkey, add primary key (owner_id, id);
alter table public.categories drop constraint categories_name_key, add constraint categories_name_key unique (owner_id, name);
alter table public.items drop constraint items_pkey, add primary key (owner_id, id);
alter table public.recipes drop constraint recipes_pkey, add primary key (owner_id, id);
alter table public.recipes drop constraint recipes_notion_id_key, add constraint recipes_notion_id_key unique (owner_id, notion_id);
alter table public.recipe_ingredients drop constraint recipe_ingredients_pkey, add primary key (owner_id, recipe_id, position);
alter table public.stores drop constraint stores_pkey, add primary key (owner_id, id);
alter table public.store_aisles drop constraint store_aisles_pkey, add primary key (owner_id, store_id, category_id);
alter table public.history drop constraint history_pkey, add primary key (owner_id, id);
-- list_entries keeps its generated id as the key: it's unique across everyone already.

-- ---------- links again, within one owner (same delete behaviour as before) ----------

alter table public.items
  add constraint items_category_id_fkey foreign key (owner_id, category_id) references public.categories (owner_id, id);
alter table public.recipe_ingredients
  add constraint recipe_ingredients_recipe_id_fkey foreign key (owner_id, recipe_id) references public.recipes (owner_id, id) on delete cascade,
  add constraint recipe_ingredients_item_id_fkey foreign key (owner_id, item_id) references public.items (owner_id, id)
    on update cascade on delete set null (item_id);
alter table public.store_aisles
  add constraint store_aisles_store_id_fkey foreign key (owner_id, store_id) references public.stores (owner_id, id) on delete cascade,
  add constraint store_aisles_category_id_fkey foreign key (owner_id, category_id) references public.categories (owner_id, id) on delete cascade;
alter table public.list_entries
  add constraint list_entries_item_id_fkey foreign key (owner_id, item_id) references public.items (owner_id, id) on delete cascade,
  add constraint list_entries_category_id_fkey foreign key (owner_id, category_id) references public.categories (owner_id, id)
    on delete set null (category_id);

-- ---------- rules: only your own rows ----------

do $$
declare
  p record;
  t text;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('categories', 'items', 'recipes', 'recipe_ingredients', 'stores', 'store_aisles', 'list_entries', 'history')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
  foreach t in array array['categories', 'items', 'recipes', 'recipe_ingredients', 'stores', 'store_aisles', 'list_entries', 'history'] loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

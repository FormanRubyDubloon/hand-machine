-- Pantry data, first cut. Mirrors SharedItem / Category in prototypes/shared/src/pantry.ts.
-- Columns that came from the Notion Pantry database are marked; the rest are pantry-app fields
-- that Notion never held, left empty for now.

create table public.categories (
  id text primary key,
  name text not null unique,
  sort int not null default 0
);

create table public.items (
  id text primary key,                                   -- slug of the name
  name text not null,                                    -- Notion: Item
  category_id text references public.categories (id),    -- Notion: Category (null when blank)
  type text not null default 'counted' check (type in ('counted', 'bulk')),  -- not in Notion
  target numeric,                                        -- Notion: Target (null = never set)
  in_stock numeric,                                      -- Notion: In stock (null = never counted)
  unit text,                                             -- Notion: Unit, free text as written
  notes text,                                            -- Notion: Notes
  ordered boolean not null default false,                -- Notion: Ordered
  where_kinds text[] not null default '{}',              -- Notion: Where (store kinds)
  -- pantry app only, not in Notion
  location text check (location in ('fridge', 'freezer', 'cupboard')),
  other_names text[] not null default '{}',
  open int,
  pack_size_amount numeric,
  pack_size_measure text check (pack_size_measure in ('g', 'ml')),
  price int,                                             -- pence
  brand text,
  use_by date[] not null default '{}',
  one_off boolean not null default false,
  uses int not null default 0,
  edited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index items_category_idx on public.items (category_id);

-- Personal data: the publishable key can read, only the service role can write.
alter table public.categories enable row level security;
alter table public.items enable row level security;
create policy "read categories" on public.categories for select to anon using (true);
create policy "read items" on public.items for select to anon using (true);

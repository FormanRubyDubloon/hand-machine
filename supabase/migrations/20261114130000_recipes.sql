-- Recipes, first cut. Mirrors SharedRecipe / SharedIngredient in prototypes/shared/src/pantry.ts.
-- Notion held them as free-form pages, so ingredients are kept as written; linking each one to a
-- pantry item (item_id) is a later step.

create table public.recipes (
  id text primary key,                 -- slug of the name
  name text not null,
  emoji text,
  intro text,                          -- the page's opening paragraph
  serves int,
  minutes int,                         -- total time, only where the page says
  prep int,
  cook int,
  source text,
  source_url text,
  notes text,
  method text[] not null default '{}',
  tags text[] not null default '{}',
  meal text check (meal in ('Breakfast', 'Lunch', 'Dinner', 'Baking')),
  want_to_cook boolean not null default false,
  soon text,
  last_cooked timestamptz,
  added_by text not null default 'you' check (added_by in ('claude', 'you')),
  added_at timestamptz not null default now(),
  notion_id text unique
);

create table public.recipe_ingredients (
  recipe_id text not null references public.recipes (id) on delete cascade,
  position int not null,
  text text not null,                  -- the recipe's own wording
  group_name text,                     -- e.g. "For the pasta"
  item_id text references public.items (id) on delete set null,
  need numeric not null default 1,
  buy numeric not null default 1,
  partial boolean not null default false,
  uses numeric,
  primary key (recipe_id, position)
);

create index recipe_ingredients_item_idx on public.recipe_ingredients (item_id);

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
create policy "read recipes" on public.recipes for select to anon using (true);
create policy "read recipe ingredients" on public.recipe_ingredients for select to anon using (true);

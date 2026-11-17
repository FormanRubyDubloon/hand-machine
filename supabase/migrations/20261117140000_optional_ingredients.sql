-- An ingredient the recipe works without ("parsley, to finish (optional)"). It doesn't count as
-- missing, Want to cook skips it, and the recipe page shows it in its own Optional group.
alter table public.recipe_ingredients
  add column if not exists optional boolean not null default false;

-- Lines that already say so in their wording, mostly from the Notion import.
update public.recipe_ingredients
set optional = true
where text ~* '\moptional\M';

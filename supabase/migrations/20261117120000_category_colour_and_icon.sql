-- A colour and an icon for each category. Both optional: a category without them shows plain.
-- colour is one of twelve named hues (prototypes/shared/src/category-look.ts); the apps draw it
-- at low opacity over the background, so it stays a muted pastel whatever the background is.
-- icon is a Lucide icon name from the same file.
alter table public.categories
  add column if not exists colour text check (colour in ('rose', 'coral', 'apricot', 'butter', 'lime', 'sage', 'mint', 'teal', 'sky', 'periwinkle', 'lavender', 'mauve')),
  add column if not exists icon text;

-- The current categories. Ones that belong together share a colour (dairy and long-life milk,
-- grains and oils). Only sets categories that don't have a colour or icon yet.
update public.categories c
set colour = coalesce(c.colour, v.colour), icon = coalesce(c.icon, v.icon)
from (values
  ('fruit-and-veg', 'sage', 'Carrot'),
  ('meat-and-fish', 'rose', 'Beef'),
  ('deli-and-cured-meats', 'coral', 'Ham'),
  ('dairy-and-chilled', 'sky', 'Milk'),
  ('frozen', 'teal', 'Snowflake'),
  ('tins-and-jars', 'periwinkle', 'Cylinder'),
  ('grains-and-pulses', 'butter', 'Wheat'),
  ('bread-and-crackers', 'apricot', 'Croissant'),
  ('baking', 'lavender', 'Cake'),
  ('herbs-and-spices', 'lime', 'Leaf'),
  ('stock-and-seasonings', 'mint', 'CookingPot'),
  ('sauces-and-condiments', 'mauve', 'Amphora'),
  ('oils-and-vinegar', 'butter', 'Droplet'),
  ('nuts-and-dried-fruit', 'apricot', 'Nut'),
  ('tea-and-coffee', 'coral', 'Coffee'),
  ('long-life-milk', 'sky', 'Milk'),
  ('snacks-and-treats', 'rose', 'Cookie'),
  ('bathroom-and-kitchen', 'periwinkle', 'SprayCan'),
  ('aisle-mwi8cr9onh90', 'mint', 'Sprout') -- Health Foods, added in the app
) as v (id, colour, icon)
where c.id = v.id;

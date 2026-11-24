-- Several tags per item (Batch 4b, 24 Nov 2026). Tags are what the code calls categories. An item can
-- have any number, or none. category_id stays, kept as the item's first tag, so apps that only know
-- one category (the Claude connection until 4c, older phone builds) still work.
alter table items add column if not exists tag_ids text[] not null default '{}';
update items set tag_ids = array[category_id] where category_id is not null and tag_ids = '{}';

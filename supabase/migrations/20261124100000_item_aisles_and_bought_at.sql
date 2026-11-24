-- Batch 4 (24 Nov 2026): aisles belong to stores and sit on each item, not on categories (now Tags).
-- `aisles` is one entry per store id: a number (4) or a named place ("Freezer"). Blank until the phone
-- learns it at a tick-off. Stores keep their own named places, in walking order, after the numbers.
-- `bought_at` is the day the item was last bought. Nothing is filled in: aisles start blank
-- (Isaac's decision) and category aisle numbers (store_aisles) are no longer read by the phone.
alter table items add column if not exists aisles jsonb not null default '{}'::jsonb;
alter table items add column if not exists bought_at date;
alter table stores add column if not exists places text[] not null default '{}';
-- How many numbered aisles a store has: the aisle question's number tiles. Null means 20.
alter table stores add column if not exists aisle_count integer check (aisle_count between 1 and 200);

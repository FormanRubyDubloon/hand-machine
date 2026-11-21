-- The store an item is bought at (the item panel's Store setting). Empty means any store with
-- the item's aisle. Before this it lived only on one computer and was lost on the next pull.
alter table items add column if not exists store_ids text[] not null default '{}';

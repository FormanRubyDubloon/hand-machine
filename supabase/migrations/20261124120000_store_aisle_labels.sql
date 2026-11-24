-- Aisle labels (Isaac's change, 24 Nov 2026): a store can give any of its aisles a label, such as
-- "Dairy and eggs" for aisle 4. Keyed by the aisle: its number ("4") or a place name in lower case.
alter table stores add column if not exists aisle_labels jsonb not null default '{}'::jsonb;

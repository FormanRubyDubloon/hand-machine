-- "This store has no aisle numbers" (Settings → Stores and aisles). When on, the store's aisle
-- numbers are kept but not used: `sells` lists the categories it sells instead, and its shopping
-- list goes A to Z. Off: aisle numbers decide both the order and what it sells, as before.
alter table stores add column if not exists no_aisle_numbers boolean not null default false;
alter table stores add column if not exists sells text[] not null default '{}';

-- Bulk items: the open pack is running low (27 Nov 2026). Set by hand in each app or by Claude; the apps
-- clear it when no pack is open. A last pack running low puts one on the shopping list.
alter table items add column if not exists open_low boolean not null default false;

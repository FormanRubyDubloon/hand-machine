-- Things that never go off (salt, tinned food, cleaning products) keep no use-by dates.
-- Household items start that way; every other item is still tracked.
alter table items add column if not exists no_expiry boolean not null default false;
update items set no_expiry = true, use_by = '{}' where location = 'household';

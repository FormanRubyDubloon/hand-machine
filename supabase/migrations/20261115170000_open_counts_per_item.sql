-- Whether an open pack counts towards the minimum is now chosen per item, not for the whole pantry.
-- Every item keeps today's behaviour (open packs don't count), so nothing changes until one is switched on.
alter table items add column if not exists open_counts boolean not null default false;
drop table if exists public.settings;

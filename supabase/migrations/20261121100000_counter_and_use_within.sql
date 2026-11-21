-- Item panel (PANEL-G/H, 21 Nov 2026): a fifth location, Counter, and a "use within, once open"
-- period for Bulk items. "household" stays the stored value; the apps now call it "Other".
alter table items drop constraint if exists items_location_check;
alter table items add constraint items_location_check
  check (location in ('fridge', 'freezer', 'cupboard', 'counter', 'household'));

-- Weeks to use a pack within once it's opened. Opening a pack moves its use-by to the earlier of
-- its printed date and the day it was opened plus this period. Empty: opening doesn't change the date.
alter table items add column if not exists use_within_weeks integer
  check (use_within_weeks is null or use_within_weeks between 1 and 52);

-- A fourth place for things that aren't food: toothpaste, dish soap, tin foil.
alter table items drop constraint if exists items_location_check;
alter table items add constraint items_location_check
  check (location in ('fridge', 'freezer', 'cupboard', 'household'));

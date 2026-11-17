-- Whether an item's price is an estimate (Claude's guess) rather than one the user gave. Shopping-list
-- totals that include an estimate show as approximate. Setting the price yourself clears it.
alter table public.items
  add column if not exists price_is_estimate boolean not null default false;

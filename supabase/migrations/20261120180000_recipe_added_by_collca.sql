-- A new account starts with an example recipe (Lamb Vindaloo) that the app adds itself, shown as
-- "Added by Collca". added_by allowed only 'claude' and 'you'.
alter table public.recipes drop constraint recipes_added_by_check;
alter table public.recipes add constraint recipes_added_by_check check (added_by in ('claude', 'you', 'collca'));

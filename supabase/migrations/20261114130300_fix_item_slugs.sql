-- Item ids were slugged without stripping accents (tomato-pur-e). Rename them; recipe links follow.
alter table public.recipe_ingredients drop constraint recipe_ingredients_item_id_fkey,
  add constraint recipe_ingredients_item_id_fkey foreign key (item_id) references public.items (id) on update cascade on delete set null;
update public.items set id = 'creme-fraiche' where id = 'creme-fra-che';
update public.items set id = 'tomato-puree' where id = 'tomato-pur-e';

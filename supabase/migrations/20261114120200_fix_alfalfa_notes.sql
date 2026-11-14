-- The load put Alfalfa seeds' note in the unit column.
update public.items set unit = null, notes = 'For sprouting; needs a sprouting jar' where id = 'alfalfa-seeds';

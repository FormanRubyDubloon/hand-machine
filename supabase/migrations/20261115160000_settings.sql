-- One row of settings shared by the pantry app, the phone and Claude.
create table if not exists public.settings (
  id boolean primary key default true check (id),
  -- false: an open pack of a bulk item doesn't count towards its minimum (how it has always worked).
  open_counts_towards_minimum boolean not null default false
);
insert into public.settings (id) values (true) on conflict do nothing;

alter table public.settings enable row level security;
create policy "read settings" on public.settings for select to anon, authenticated using (true);
create policy "change settings" on public.settings for update to authenticated using (true) with check (true);

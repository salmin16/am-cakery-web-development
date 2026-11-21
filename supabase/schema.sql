begin;

create table if not exists public.catalogue_categories (
  id text primary key,
  name text not null,
  description text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.catalogue_items (
  id text primary key,
  name text not null,
  description text not null default '',
  category_id text not null references public.catalogue_categories(id) on update cascade on delete restrict,
  image_url text not null default '',
  pricing_type text not null default 'single' check (pricing_type in ('single', 'options')),
  base_price numeric(12,2) not null default 0 check (base_price >= 0),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  available boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists catalogue_items_category_id_idx on public.catalogue_items(category_id);
create index if not exists catalogue_items_public_idx on public.catalogue_items(published, category_id);

create table if not exists public.bakery_settings (
  id text primary key default 'default' check (id = 'default'),
  business_name text not null,
  whatsapp text not null,
  location text not null default '',
  tagline text not null default '',
  description text not null default '',
  logo_url text not null default '/am-cakery-logo.png',
  updated_at timestamptz not null default now()
);

alter table public.catalogue_categories enable row level security;
alter table public.catalogue_items enable row level security;
alter table public.bakery_settings enable row level security;

grant select on public.catalogue_categories, public.catalogue_items, public.bakery_settings to anon, authenticated;
grant insert, update, delete on public.catalogue_categories, public.catalogue_items, public.bakery_settings to authenticated;

create or replace function public.is_catalogue_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner';
$$;
revoke all on function public.is_catalogue_owner() from public;
grant execute on function public.is_catalogue_owner() to authenticated;

drop policy if exists "Public can read published categories" on public.catalogue_categories;
create policy "Public can read published categories" on public.catalogue_categories for select to anon, authenticated using (published);
drop policy if exists "Authenticated users can manage categories" on public.catalogue_categories;
drop policy if exists "Owners can manage categories" on public.catalogue_categories;
create policy "Owners can manage categories" on public.catalogue_categories for all to authenticated using (public.is_catalogue_owner()) with check (public.is_catalogue_owner());

drop policy if exists "Public can read published catalogue items" on public.catalogue_items;
create policy "Public can read published catalogue items" on public.catalogue_items for select to anon, authenticated using (published);
drop policy if exists "Authenticated users can manage catalogue items" on public.catalogue_items;
drop policy if exists "Owners can manage catalogue items" on public.catalogue_items;
create policy "Owners can manage catalogue items" on public.catalogue_items for all to authenticated using (public.is_catalogue_owner()) with check (public.is_catalogue_owner());

drop policy if exists "Public can read bakery settings" on public.bakery_settings;
create policy "Public can read bakery settings" on public.bakery_settings for select to anon, authenticated using (true);
drop policy if exists "Authenticated users can manage bakery settings" on public.bakery_settings;
drop policy if exists "Owners can manage bakery settings" on public.bakery_settings;
create policy "Owners can manage bakery settings" on public.bakery_settings for all to authenticated using (public.is_catalogue_owner()) with check (public.is_catalogue_owner());

insert into public.catalogue_categories (id, name, description, published, created_at) values
  ('cakes', 'Cakes', 'Celebration cakes, made with care.', true, '2026-11-21T00:00:00Z'),
  ('sambusa', 'Sambusa', 'Golden savoury favourites.', true, '2026-11-21T00:00:00Z'),
  ('donuts', 'Donuts', 'Freshly baked little treats.', true, '2026-11-21T00:00:00Z'),
  ('snacks', 'Snacks', 'Something lovely for every day.', true, '2026-11-21T00:00:00Z'),
  ('other', 'Other', 'More from our kitchen.', true, '2026-11-21T00:00:00Z')
on conflict (id) do nothing;

insert into public.catalogue_items (id, name, description, category_id, image_url, pricing_type, base_price, options, available, published, created_at, updated_at) values
  ('chocolate-cake', 'Chocolate Cake', 'Deep cocoa, tender crumb and a little celebration in every slice.', 'cakes', '/chocolate-cake.png', 'options', 0, '[{"id":"half-kg","name":"0.5 kg","price":20000},{"id":"one-kg","name":"1 kg","price":35000},{"id":"one-half-kg","name":"1.5 kg","price":50000},{"id":"two-kg","name":"2 kg","price":65000}]'::jsonb, true, true, '2026-11-21T00:00:00Z', '2026-11-21T00:00:00Z'),
  ('vanilla-cake', 'Vanilla Cake', 'Soft vanilla layers with a delicate, buttery finish.', 'cakes', '/vanilla-cake.png', 'options', 0, '[{"id":"half-kg","name":"0.5 kg","price":18000},{"id":"one-kg","name":"1 kg","price":30000},{"id":"one-half-kg","name":"1.5 kg","price":43000},{"id":"two-kg","name":"2 kg","price":55000}]'::jsonb, true, true, '2026-11-21T00:00:00Z', '2026-11-21T00:00:00Z'),
  ('sambusa', 'Sambusa', 'Golden, crisp pastry with a savoury centre. Sold per piece.', 'sambusa', '/sambusa.png', 'single', 1000, '[]'::jsonb, true, true, '2026-11-21T00:00:00Z', '2026-11-21T00:00:00Z'),
  ('donut', 'Donut', 'A soft, freshly made treat with a light cocoa drizzle.', 'donuts', '/donut.png', 'single', 1500, '[]'::jsonb, true, true, '2026-11-21T00:00:00Z', '2026-11-21T00:00:00Z')
on conflict (id) do nothing;

insert into public.bakery_settings (id, business_name, whatsapp, location, tagline, description, logo_url)
values ('default', 'AM CAKERY', '255786169647', 'Ubungo Riverside, Dar es Salaam', 'Freshly Baked. Beautifully Made.', 'AM CAKERY is a bakery based in Ubungo Riverside, Dar es Salaam, creating cakes, snacks and other freshly baked treats for everyday moments and special occasions.', '/am-cakery-logo.png')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalogue-images', 'catalogue-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']::text[])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

grant select on storage.objects to anon, authenticated;
grant insert, update, delete on storage.objects to authenticated;

drop policy if exists "Public can view catalogue images" on storage.objects;
create policy "Public can view catalogue images" on storage.objects for select to anon, authenticated using (bucket_id = 'catalogue-images');
drop policy if exists "Authenticated users can upload catalogue images" on storage.objects;
drop policy if exists "Authenticated owners can upload catalogue images" on storage.objects;
create policy "Authenticated owners can upload catalogue images" on storage.objects for insert to authenticated with check (bucket_id = 'catalogue-images' and public.is_catalogue_owner());
drop policy if exists "Authenticated users can update catalogue images" on storage.objects;
drop policy if exists "Authenticated owners can update catalogue images" on storage.objects;
create policy "Authenticated owners can update catalogue images" on storage.objects for update to authenticated using (bucket_id = 'catalogue-images' and public.is_catalogue_owner()) with check (bucket_id = 'catalogue-images' and public.is_catalogue_owner());
drop policy if exists "Authenticated users can delete catalogue images" on storage.objects;
drop policy if exists "Authenticated owners can delete catalogue images" on storage.objects;
create policy "Authenticated owners can delete catalogue images" on storage.objects for delete to authenticated using (bucket_id = 'catalogue-images' and public.is_catalogue_owner());

commit;

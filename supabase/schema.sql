-- ============================================================================
-- AM CAKERY — Supabase Production Schema, RLS Policies & Storage Policies
-- ============================================================================
-- Run this entire script in the Supabase SQL Editor (Dashboard -> SQL Editor).
-- It is idempotent and safe to re-run.
-- ============================================================================

-- 1. Helper trigger function to automatically maintain updated_at timestamps
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 2. Tables
-- ============================================================================

-- 2a. Categories (menu collections)
create table if not exists public.catalogue_categories (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_catalogue_categories_updated_at on public.catalogue_categories;
create trigger trg_catalogue_categories_updated_at
  before update on public.catalogue_categories
  for each row execute function public.set_updated_at();

-- 2b. Catalogue Items (products)
create table if not exists public.catalogue_items (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(trim(name)) > 0),
  description text not null default '',
  category_id text references public.catalogue_categories(id) on delete set null,
  image_url text not null default '',
  pricing_type text not null default 'single' check (pricing_type in ('single', 'options')),
  base_price integer not null default 0 check (base_price >= 0),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  available boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalogue_items_category_id on public.catalogue_items (category_id);
create index if not exists idx_catalogue_items_published on public.catalogue_items (published);
create index if not exists idx_catalogue_items_created_at on public.catalogue_items (created_at desc);

drop trigger if exists trg_catalogue_items_updated_at on public.catalogue_items;
create trigger trg_catalogue_items_updated_at
  before update on public.catalogue_items
  for each row execute function public.set_updated_at();

-- 2c. Business Settings (single-row storefront configuration)
create table if not exists public.business_settings (
  id text primary key default 'default' check (id = 'default'),
  business_name text not null default 'AM CAKERY',
  whatsapp text not null default '255786169647',
  location text not null default 'Ubungo Riverside, Dar es Salaam',
  tagline text not null default 'Freshly Baked. Beautifully Made.',
  description text not null default '',
  logo_url text not null default '/am-cakery-logo.png',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_business_settings_updated_at on public.business_settings;
create trigger trg_business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. Table Grants & Row-Level Security (RLS)
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant select on public.catalogue_items, public.catalogue_categories, public.business_settings to anon;
grant select, insert, update, delete on public.catalogue_items, public.catalogue_categories, public.business_settings to authenticated;

alter table public.catalogue_items enable row level security;
alter table public.catalogue_categories enable row level security;
alter table public.business_settings enable row level security;

-- ---- catalogue_items policies ----
-- Public visitors can read only published items on the storefront.
drop policy if exists "Public can view published catalogue items" on public.catalogue_items;
create policy "Public can view published catalogue items"
  on public.catalogue_items
  for select
  to anon
  using (published = true);

-- Authenticated administrators can read all items (including hidden drafts).
drop policy if exists "Authenticated admins can view all catalogue items" on public.catalogue_items;
create policy "Authenticated admins can view all catalogue items"
  on public.catalogue_items
  for select
  to authenticated
  using (true);

-- Only authenticated administrators can insert, update, or delete items.
drop policy if exists "Authenticated admins can insert catalogue items" on public.catalogue_items;
create policy "Authenticated admins can insert catalogue items"
  on public.catalogue_items
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated admins can update catalogue items" on public.catalogue_items;
create policy "Authenticated admins can update catalogue items"
  on public.catalogue_items
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated admins can delete catalogue items" on public.catalogue_items;
create policy "Authenticated admins can delete catalogue items"
  on public.catalogue_items
  for delete
  to authenticated
  using (true);

-- ---- catalogue_categories policies ----
drop policy if exists "Public can view published categories" on public.catalogue_categories;
create policy "Public can view published categories"
  on public.catalogue_categories
  for select
  to anon
  using (published = true);

drop policy if exists "Authenticated admins can view all categories" on public.catalogue_categories;
create policy "Authenticated admins can view all categories"
  on public.catalogue_categories
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated admins can insert categories" on public.catalogue_categories;
create policy "Authenticated admins can insert categories"
  on public.catalogue_categories
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated admins can update categories" on public.catalogue_categories;
create policy "Authenticated admins can update categories"
  on public.catalogue_categories
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated admins can delete categories" on public.catalogue_categories;
create policy "Authenticated admins can delete categories"
  on public.catalogue_categories
  for delete
  to authenticated
  using (true);

-- ---- business_settings policies ----
drop policy if exists "Public can view business settings" on public.business_settings;
create policy "Public can view business settings"
  on public.business_settings
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated admins can insert business settings" on public.business_settings;
create policy "Authenticated admins can insert business settings"
  on public.business_settings
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated admins can update business settings" on public.business_settings;
create policy "Authenticated admins can update business settings"
  on public.business_settings
  for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================================
-- 4. Supabase Storage Bucket & Policies (catalogue-images)
-- ============================================================================

-- Create (or ensure public configuration on) the catalogue-images bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogue-images',
  'catalogue-images',
  true,
  5242880, -- 5 MB max per image
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public visitors can view images in the catalogue-images bucket.
drop policy if exists "Public can view catalogue images" on storage.objects;
create policy "Public can view catalogue images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'catalogue-images');

-- Only authenticated administrators can upload images.
drop policy if exists "Authenticated admins can upload catalogue images" on storage.objects;
create policy "Authenticated admins can upload catalogue images"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'catalogue-images');

-- Only authenticated administrators can replace/update images.
drop policy if exists "Authenticated admins can update catalogue images" on storage.objects;
create policy "Authenticated admins can update catalogue images"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'catalogue-images')
  with check (bucket_id = 'catalogue-images');

-- Only authenticated administrators can delete images.
drop policy if exists "Authenticated admins can delete catalogue images" on storage.objects;
create policy "Authenticated admins can delete catalogue images"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'catalogue-images');

-- ============================================================================
-- 5. Initial Starter Seed Data (idempotent — won't overwrite existing edits)
-- ============================================================================

insert into public.catalogue_categories (id, name, description, published)
values
  ('cakes', 'Cakes', 'Celebration cakes, made with care.', true),
  ('sambusa', 'Sambusa', 'Golden savoury favourites.', true),
  ('donuts', 'Donuts', 'Freshly baked little treats.', true),
  ('snacks', 'Snacks', 'Something lovely for every day.', true),
  ('other', 'Other', 'More from our kitchen.', true)
on conflict (id) do nothing;

insert into public.business_settings (id, business_name, whatsapp, location, tagline, description, logo_url)
values (
  'default',
  'AM CAKERY',
  '255786169647',
  'Ubungo Riverside, Dar es Salaam',
  'Freshly Baked. Beautifully Made.',
  'AM CAKERY is a bakery based in Ubungo Riverside, Dar es Salaam, creating cakes, snacks and other freshly baked treats for everyday moments and special occasions.',
  '/am-cakery-logo.png'
)
on conflict (id) do nothing;

insert into public.catalogue_items (id, name, description, category_id, image_url, pricing_type, base_price, options, available, published)
values
  (
    'chocolate-cake',
    'Chocolate Cake',
    'Deep cocoa, tender crumb and a little celebration in every slice.',
    'cakes',
    '/chocolate-cake.png',
    'options',
    0,
    '[{"id":"half-kg","name":"0.5 kg","price":20000},{"id":"one-kg","name":"1 kg","price":35000},{"id":"one-half-kg","name":"1.5 kg","price":50000},{"id":"two-kg","name":"2 kg","price":65000}]'::jsonb,
    true,
    true
  ),
  (
    'vanilla-cake',
    'Vanilla Cake',
    'Soft vanilla layers with a delicate, buttery finish.',
    'cakes',
    '/vanilla-cake.png',
    'options',
    0,
    '[{"id":"half-kg","name":"0.5 kg","price":18000},{"id":"one-kg","name":"1 kg","price":30000},{"id":"one-half-kg","name":"1.5 kg","price":43000},{"id":"two-kg","name":"2 kg","price":55000}]'::jsonb,
    true,
    true
  ),
  (
    'sambusa',
    'Sambusa',
    'Golden, crisp pastry with a savoury centre. Sold per piece.',
    'sambusa',
    '/sambusa.png',
    'single',
    1000,
    '[]'::jsonb,
    true,
    true
  ),
  (
    'donut',
    'Donut',
    'A soft, freshly made treat with a light cocoa drizzle.',
    'donuts',
    '/donut.png',
    'single',
    1500,
    '[]'::jsonb,
    true,
    true
  )
on conflict (id) do nothing;

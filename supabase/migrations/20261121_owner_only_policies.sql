begin;

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

drop policy if exists "Authenticated users can manage categories" on public.catalogue_categories;
drop policy if exists "Owners can manage categories" on public.catalogue_categories;
create policy "Owners can manage categories" on public.catalogue_categories for all to authenticated using (public.is_catalogue_owner()) with check (public.is_catalogue_owner());

drop policy if exists "Authenticated users can manage catalogue items" on public.catalogue_items;
drop policy if exists "Owners can manage catalogue items" on public.catalogue_items;
create policy "Owners can manage catalogue items" on public.catalogue_items for all to authenticated using (public.is_catalogue_owner()) with check (public.is_catalogue_owner());

drop policy if exists "Authenticated users can manage bakery settings" on public.bakery_settings;
drop policy if exists "Owners can manage bakery settings" on public.bakery_settings;
create policy "Owners can manage bakery settings" on public.bakery_settings for all to authenticated using (public.is_catalogue_owner()) with check (public.is_catalogue_owner());

drop policy if exists "Authenticated users can upload catalogue images" on storage.objects;
create policy "Authenticated owners can upload catalogue images" on storage.objects for insert to authenticated with check (bucket_id = 'catalogue-images' and public.is_catalogue_owner());
drop policy if exists "Authenticated users can update catalogue images" on storage.objects;
create policy "Authenticated owners can update catalogue images" on storage.objects for update to authenticated using (bucket_id = 'catalogue-images' and public.is_catalogue_owner()) with check (bucket_id = 'catalogue-images' and public.is_catalogue_owner());
drop policy if exists "Authenticated users can delete catalogue images" on storage.objects;
create policy "Authenticated owners can delete catalogue images" on storage.objects for delete to authenticated using (bucket_id = 'catalogue-images' and public.is_catalogue_owner());

commit;

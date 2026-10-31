begin;

create table public.shop_media_assets(id uuid primary key,shop_id uuid not null references public.shops(id),ready boolean not null default false,created_at timestamptz not null default now());
create index shop_media_shop_idx on public.shop_media_assets(shop_id,created_at);
alter table public.shop_media_assets enable row level security;
revoke all on public.shop_media_assets from public,anon,authenticated;
grant all on public.shop_media_assets to service_role;

create function public.register_shop_media(p_shop uuid,p_actor uuid,p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.shop_memberships m join public.shops s on s.id=m.shop_id where m.shop_id=p_shop and m.user_id=p_actor and m.revoked_at is null and s.status not in ('suspended','closed')) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext(p_shop::text));
  if (select count(*) from public.shop_media_assets where shop_id=p_shop)>=200 or (select count(*) from public.shop_media_assets where shop_id=p_shop and created_at>now()-interval '1 day')>=30 then raise exception 'media_quota_exceeded' using errcode='22023'; end if;
  insert into public.shop_media_assets(id,shop_id) values(p_id,p_shop);
end;
$$;

create function public.is_shop_media_path(p text) returns boolean language sql immutable set search_path='' as $$
  select coalesce(p ~ '^/media/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$',false);
$$;
alter function public.valid_shop_layout(jsonb) rename to valid_shop_layout_presets;
create function public.valid_shop_layout(p jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare checked jsonb:=p; images jsonb;
begin
  if public.is_shop_media_path(p->>'cover') then checked=jsonb_set(checked,'{cover}','"/products/ceramica-luna.avif"'); end if;
  if jsonb_typeof(p->'gallery')='array' then
    select coalesce(jsonb_agg(case when public.is_shop_media_path(g#>>'{}') then '"/products/ceramica-luna.avif"'::jsonb else g end),'[]') into images from jsonb_array_elements(p->'gallery') g;
    checked=jsonb_set(checked,'{gallery}',images);
  end if;
  return public.valid_shop_layout_presets(checked);
end;
$$;
alter table public.shop_pages drop constraint shop_pages_draft_valid;
alter table public.shop_pages drop constraint shop_pages_published_valid;
alter table public.shop_pages add constraint shop_pages_draft_valid check(public.valid_shop_layout(draft));
alter table public.shop_pages add constraint shop_pages_published_valid check(published is null or public.valid_shop_layout(published));

create function public.assert_shop_media(p_shop uuid,p_image text) returns void language plpgsql security definer set search_path='' as $$
begin
  if public.is_shop_media_path(p_image) and not exists(select 1 from public.shop_media_assets where shop_id=p_shop and ready and id=substring(p_image from 8 for 36)::uuid) then raise exception 'media_access_denied' using errcode='42501'; end if;
end;
$$;
alter function public.valid_catalog_product_image(text) rename to valid_catalog_product_image_presets;
create function public.valid_catalog_product_image(p_image text) returns boolean language sql immutable set search_path='' as $$select public.valid_catalog_product_image_presets(p_image) or public.is_shop_media_path(p_image)$$;
alter function public.save_shop_product(uuid,text,jsonb,boolean) rename to save_shop_product_core;
create function public.save_shop_product(p_shop_id uuid,p_product_id text,p_data jsonb,p_submit boolean default false) returns text language plpgsql security definer set search_path='' as $$
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  perform public.assert_shop_media(p_shop_id,p_data->>'image');
  return public.save_shop_product_core(p_shop_id,p_product_id,p_data,p_submit);
end;
$$;
alter function public.save_shop_page(uuid,jsonb,integer) rename to save_shop_page_core;
create function public.save_shop_page(p_shop_id uuid,p_draft jsonb,p_revision integer) returns integer language plpgsql security definer set search_path='' as $$
declare image jsonb;
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  if not public.valid_shop_layout(p_draft) then raise exception 'invalid_shop_layout' using errcode='22023'; end if;
  perform public.assert_shop_media(p_shop_id,p_draft->>'cover');
  for image in select * from jsonb_array_elements(p_draft->'gallery') loop perform public.assert_shop_media(p_shop_id,image#>>'{}'); end loop;
  return public.save_shop_page_core(p_shop_id,p_draft,p_revision);
end;
$$;
revoke all on function public.register_shop_media(uuid,uuid,uuid),public.assert_shop_media(uuid,text),public.save_shop_page_core(uuid,jsonb,integer),public.save_shop_product_core(uuid,text,jsonb,boolean),public.save_shop_page(uuid,jsonb,integer),public.save_shop_product(uuid,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.register_shop_media(uuid,uuid,uuid) to service_role;
grant execute on function public.save_shop_page(uuid,jsonb,integer),public.save_shop_product(uuid,text,jsonb,boolean) to authenticated;

do $$begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('shop-media','shop-media',false,5242880,array['image/webp']) on conflict(id) do nothing;
  end if;
end$$;

commit;

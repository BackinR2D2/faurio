begin;

create or replace function public.valid_catalog_product_image(p_image text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_image = any(array[
    '/products/ceramica-luna.avif',
    '/products/broderie-camp.avif',
    '/products/lumanare-terrazzo.avif',
    '/products/catalog/cana-luna.webp',
    '/products/catalog/ceasca-zori.webp',
    '/products/catalog/vaza-pamant.webp',
    '/products/catalog/vaza-indigo.webp',
    '/products/catalog/bol-nisip.webp',
    '/products/catalog/farfurie-floare.webp',
    '/products/catalog/pahar-prisma.webp',
    '/products/catalog/set-pahare-rau.webp',
    '/products/catalog/pahar-onda.webp',
    '/products/catalog/broderie-ierbar.webp',
    '/products/catalog/perna-apus.webp',
    '/products/catalog/patura-molid.webp',
    '/products/catalog/lumanare-chihlimbar.webp',
    '/products/catalog/lumanare-smochin.webp',
    '/products/catalog/suport-arc.webp',
    '/products/catalog/colier-roua.webp',
    '/products/catalog/cercei-frunza.webp',
    '/products/catalog/bratara-fir.webp',
    '/products/catalog/cutie-nuc.webp',
    '/products/catalog/tava-nord.webp',
    '/products/catalog/rama-feriga.webp',
    '/products/catalog/decor-luna.webp',
    '/products/catalog/jurnal-herbarium.webp',
    '/products/catalog/semn-tei.webp'
  ]::text[]),false);
$$;

create or replace function public.save_shop_product(p_shop_id uuid,p_product_id text,p_data jsonb,p_submit boolean default false) returns text language plpgsql security definer set search_path = '' as $$
declare product text := coalesce(p_product_id,gen_random_uuid()::text); author_name text; author_location text;
begin
  if not public.can_edit_shop(p_shop_id) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  if p_product_id is not null and not exists(select 1 from public.products where id=p_product_id and shop_id=p_shop_id) then raise exception 'product_access_denied' using errcode='42501'; end if;
  if octet_length(p_data::text)>20000 or coalesce(char_length(p_data->>'name'),0) not between 2 and 140 or coalesce(char_length(p_data->>'description'),0) not between 20 and 4000 then raise exception 'invalid_product' using errcode='22023'; end if;
  if (p_data->>'price')::integer not between 1 and 100000 or (p_data->>'stock')::integer not between 0 and 9999 or (p_data->>'shipping_days')::integer not between 1 and 90 then raise exception 'invalid_product_numbers' using errcode='22023'; end if;
  if coalesce(p_data->>'category','') not in ('Ceramică','Sticlărie','Textile','Lumânări','Bijuterii','Lemn','Decorațiuni','Papetărie') then raise exception 'invalid_category' using errcode='22023'; end if;
  if not public.valid_catalog_product_image(p_data->>'image') then raise exception 'invalid_product_image' using errcode='22023'; end if;
  select name,location into author_name,author_location from public.shops where id=p_shop_id;
  insert into public.products(id,shop_id,name,product_type,category,price,stock,maker,maker_location,material,color,image,description,shipping_days,active,listing_status,rating,reviews,rating_source)
  values(product,p_shop_id,p_data->>'name',coalesce(p_data->>'product_type','Produs'),p_data->>'category',(p_data->>'price')::integer,(p_data->>'stock')::integer,author_name,author_location,coalesce(p_data->>'material',''),coalesce(p_data->>'color',''),p_data->>'image',p_data->>'description',(p_data->>'shipping_days')::integer,false,case when p_submit then 'pending_review' else 'draft' end,0,0,'verified')
  on conflict(id) do update set name=excluded.name,product_type=excluded.product_type,category=excluded.category,price=excluded.price,stock=excluded.stock,material=excluded.material,color=excluded.color,image=excluded.image,description=excluded.description,shipping_days=excluded.shipping_days,active=false,listing_status=excluded.listing_status,updated_at=now();
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id) values(auth.uid(),p_shop_id,case when p_submit then 'product.submitted' else 'product.saved' end,product);
  return product;
end;
$$;

revoke all on function public.valid_catalog_product_image(text) from public;
grant execute on function public.valid_catalog_product_image(text) to authenticated,service_role;

commit;

begin;

alter table public.product_reviews alter column order_code drop not null;
alter table public.product_reviews add column verified_purchase boolean not null default false;
update public.product_reviews set verified_purchase=true where order_code is not null;
alter table public.product_reviews add constraint review_verification_requires_order check (not verified_purchase or order_code is not null);
create index reviews_buyer_product on public.product_reviews(buyer_id,product_id);

create or replace view public.public_product_reviews with(security_barrier=true) as
  select r.id,r.product_id,r.rating,r.body,r.created_at,r.verified_purchase
  from public.product_reviews r join public.catalog_products p on p.id=r.product_id where r.status='approved';

create or replace function public.submit_product_review(p_code text,p_product text,p_rating integer,p_body text) returns uuid
language plpgsql security definer set search_path='' as $$
declare review_id uuid; purchase_code text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.catalog_products where id=p_product) then raise exception 'review_product_unavailable' using errcode='42501'; end if;
  if exists(select 1 from public.products p where p.id=p_product and public.is_shop_member(p.shop_id)) then raise exception 'self_review_forbidden' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtext('product-review-'||auth.uid()::text||'-'||p_product));
  if exists(select 1 from public.product_reviews where buyer_id=auth.uid() and product_id=p_product) then
    raise exception 'review_already_exists' using errcode='23505';
  end if;
  select o.code into purchase_code from public.orders o join public.seller_fulfillments f on f.order_code=o.code
  where o.user_id=auth.uid() and o.status='paid' and f.state='delivered'
    and (p_code is null or o.code=p_code)
    and exists(select 1 from jsonb_array_elements(o.items) item where item->>'id'=p_product)
  order by o.created_at desc,o.code limit 1;
  if p_code is not null and purchase_code is null then raise exception 'verified_delivery_required' using errcode='42501'; end if;
  if (select count(*) from public.product_reviews where buyer_id=auth.uid() and created_at>now()-interval '1 day')>=20 then
    raise exception 'review_daily_limit' using errcode='54000';
  end if;
  insert into public.product_reviews(order_code,product_id,buyer_id,rating,body,verified_purchase)
  values(purchase_code,p_product,auth.uid(),p_rating,trim(p_body),purchase_code is not null) returning id into review_id;
  return review_id;
end;
$$;

revoke all on function public.submit_product_review(text,text,integer,text) from public,anon;
grant execute on function public.submit_product_review(text,text,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;

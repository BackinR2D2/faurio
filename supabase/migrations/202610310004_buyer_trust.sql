begin;
create table public.public_form_usage(kind text not null,key text not null,window_start timestamptz not null,calls integer not null default 0,primary key(kind,key,window_start));
alter table public.public_form_usage enable row level security;
revoke all on public.public_form_usage from public,anon,authenticated;
create function public.claim_public_form_slot(p_kind text,p_key text) returns boolean language plpgsql security definer set search_path='' as $$
begin
  if p_kind not in ('contact','newsletter','checkout') or p_key!~'^[a-f0-9]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(hashtext('public-form-'||p_kind));
  if coalesce((select calls from public.public_form_usage where kind=p_kind and key='global' and window_start=date_trunc('day',now())),0)>=200
    or coalesce((select calls from public.public_form_usage where kind=p_kind and key=p_key and window_start=date_trunc('hour',now())),0)>=10 then return false; end if;
  insert into public.public_form_usage(kind,key,window_start,calls) values(p_kind,p_key,date_trunc('hour',now()),1) on conflict(kind,key,window_start) do update set calls=public.public_form_usage.calls+1;
  insert into public.public_form_usage(kind,key,window_start,calls) values(p_kind,'global',date_trunc('day',now()),1) on conflict(kind,key,window_start) do update set calls=public.public_form_usage.calls+1;
  delete from public.public_form_usage where window_start<now()-interval '2 days';
  return true;
end;
$$;
revoke all on function public.claim_public_form_slot(text,text) from public,anon,authenticated;
grant execute on function public.claim_public_form_slot(text,text) to service_role;
create table public.product_reviews(
  id uuid primary key default gen_random_uuid(),order_code text not null references public.orders(code),product_id text not null references public.products(id),
  buyer_id uuid not null references auth.users(id),rating integer not null check(rating between 1 and 5),body text not null check(length(body) between 5 and 2000),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),created_at timestamptz not null default now(),unique(order_code,product_id)
);
create table public.return_requests(
  id uuid primary key default gen_random_uuid(),order_code text not null unique references public.orders(code),buyer_id uuid not null references auth.users(id),
  message text not null check(length(message) between 5 and 2000),status text not null default 'submitted' check(status in ('submitted','reviewing','resolved','rejected')),
  operator_note text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.product_reviews enable row level security;
alter table public.return_requests enable row level security;
revoke all on public.product_reviews,public.return_requests from public,anon,authenticated;
grant select on public.product_reviews,public.return_requests to authenticated;
grant all on public.product_reviews,public.return_requests to service_role;
create policy reviews_buyer_read on public.product_reviews for select to authenticated using(buyer_id=(select auth.uid()));
create policy returns_buyer_read on public.return_requests for select to authenticated using(buyer_id=(select auth.uid()));
create view public.public_product_reviews with(security_barrier=true) as
  select r.id,r.product_id,r.rating,r.body,r.created_at from public.product_reviews r join public.catalog_products p on p.id=r.product_id where r.status='approved';
grant select on public.public_product_reviews to anon,authenticated,service_role;

create function public.refresh_verified_rating() returns trigger language plpgsql security definer set search_path='' as $$
declare target text:=coalesce(new.product_id,old.product_id);
begin
  update public.products p set rating=coalesce((select round(avg(r.rating),2) from public.product_reviews r where r.product_id=target and r.status='approved'),0),
    reviews=(select count(*) from public.product_reviews r where r.product_id=target and r.status='approved'),rating_source='verified' where p.id=target;
  return null;
end;
$$;
create trigger reviews_refresh_rating after insert or update or delete on public.product_reviews for each row execute function public.refresh_verified_rating();

create function public.submit_product_review(p_code text,p_product text,p_rating integer,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare review_id uuid;
begin
  if not exists(select 1 from public.orders o join public.seller_fulfillments f on f.order_code=o.code where o.code=p_code and o.user_id=auth.uid() and o.status='paid' and f.state='delivered' and exists(select 1 from jsonb_array_elements(o.items) item where item->>'id'=p_product)) then raise exception 'verified_delivery_required' using errcode='42501'; end if;
  if exists(select 1 from public.products p where p.id=p_product and public.is_shop_member(p.shop_id)) then raise exception 'self_review_forbidden' using errcode='42501'; end if;
  insert into public.product_reviews(order_code,product_id,buyer_id,rating,body) values(p_code,p_product,auth.uid(),p_rating,trim(p_body)) returning id into review_id;
  return review_id;
end;
$$;
create function public.request_order_return(p_code text,p_message text) returns uuid language plpgsql security definer set search_path='' as $$
declare request_id uuid;
begin
  if not exists(select 1 from public.orders where code=p_code and user_id=auth.uid() and status='paid') then raise exception 'order_access_denied' using errcode='42501'; end if;
  insert into public.return_requests(order_code,buyer_id,message) values(p_code,auth.uid(),trim(p_message)) returning id into request_id;
  return request_id;
end;
$$;
create function public.buyer_order_progress(p_page integer default 1) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('code',o.code,'state',f.state,'carrier',f.carrier,'tracking',f.tracking,'returnStatus',r.status,'returnNote',r.operator_note,'reviewedProductIds',coalesce((select jsonb_agg(pr.product_id) from public.product_reviews pr where pr.order_code=o.code and pr.buyer_id=auth.uid()),'[]'))),'[]')
  from (select code from public.orders where user_id=auth.uid() order by created_at desc,code limit 25 offset (greatest(1,least(p_page,10000))-1)*25) o
  left join public.seller_fulfillments f on f.order_code=o.code left join public.return_requests r on r.order_code=o.code;
$$;
create function public.moderate_buyer_feedback(p_actor uuid,p_kind text,p_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare shop uuid;
begin
  if length(trim(p_reason)) not between 5 and 1000 then raise exception 'moderation_reason_required' using errcode='22023'; end if;
  if p_kind='reviews' and p_status in ('approved','rejected') then
    update public.product_reviews set status=p_status where id=p_id returning (select p.shop_id from public.products p where p.id=product_id) into shop;
  elsif p_kind='returns' and p_status in ('reviewing','resolved','rejected') then
    update public.return_requests set status=p_status,operator_note=p_reason,updated_at=now() where id=p_id returning (select f.shop_id from public.marketplace_order_finance f where f.order_code=return_requests.order_code) into shop;
  else raise exception 'invalid_feedback_state' using errcode='22023'; end if;
  if not found then raise exception 'feedback_not_found' using errcode='P0002'; end if;
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id,reason) values(p_actor,shop,p_kind||'.'||p_status,p_id::text,p_reason);
end;
$$;
revoke all on function public.refresh_verified_rating(),public.submit_product_review(text,text,integer,text),public.request_order_return(text,text),public.buyer_order_progress(integer),public.moderate_buyer_feedback(uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.submit_product_review(text,text,integer,text),public.request_order_return(text,text),public.buyer_order_progress(integer) to authenticated;
grant execute on function public.moderate_buyer_feedback(uuid,text,uuid,text,text) to service_role;
commit;

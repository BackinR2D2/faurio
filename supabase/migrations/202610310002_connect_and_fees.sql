begin;

create table public.checkout_attempts(id uuid primary key,fingerprint text not null,order_code text not null unique,expires_at timestamptz not null,created_at timestamptz not null default now());
alter table public.checkout_attempts enable row level security;
revoke all on public.checkout_attempts from public,anon,authenticated;
grant select on public.checkout_attempts to service_role;
create function public.get_checkout_attempt(p_id uuid,p_fingerprint text) returns jsonb language plpgsql security definer set search_path='' as $$
declare attempt public.checkout_attempts%rowtype;
begin
  if p_fingerprint!~'^[a-f0-9]{64}$' then raise exception 'invalid_checkout_fingerprint'; end if;
  insert into public.checkout_attempts(id,fingerprint,order_code,expires_at) values(p_id,p_fingerprint,'FAU-'||extract(year from now())::text||'-'||upper(p_id::text),now()+interval '32 minutes') on conflict(id) do nothing;
  select * into attempt from public.checkout_attempts where id=p_id;
  if attempt.fingerprint<>p_fingerprint then raise exception 'checkout_attempt_changed' using errcode='22023'; end if;
  if attempt.expires_at<=now() then raise exception 'checkout_attempt_expired' using errcode='22023'; end if;
  return jsonb_build_object('code',attempt.order_code,'expiresAt',floor(extract(epoch from attempt.expires_at)));
end;
$$;
revoke all on function public.get_checkout_attempt(uuid,text) from public,anon,authenticated;
grant execute on function public.get_checkout_attempt(uuid,text) to service_role;

create table public.shop_payment_accounts (
  shop_id uuid primary key references public.shops(id),stripe_account_id text not null unique check(stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  test_mode boolean not null default true,charges_enabled boolean not null default false,payouts_enabled boolean not null default false,
  transfers_enabled boolean not null default false,updated_at timestamptz not null default now()
);
create table public.seller_fee_acceptances(shop_id uuid primary key references public.shops(id),user_id uuid not null references auth.users(id),version text not null,accepted_at timestamptz not null default now());
alter table public.seller_fee_acceptances enable row level security;
revoke all on public.seller_fee_acceptances from public,anon,authenticated;
grant all on public.seller_fee_acceptances to service_role;
create table public.marketplace_order_finance (
  order_code text primary key references public.orders(code),shop_id uuid not null references public.shops(id),stripe_account_id text,
  product_subtotal_minor bigint not null check(product_subtotal_minor>=0),shipping_minor bigint not null check(shipping_minor>=0),
  fee_bps integer not null default 550 check(fee_bps=550),fee_minor bigint not null check(fee_minor>=0),
  seller_transfer_minor bigint not null check(seller_transfer_minor>=0),refunded_minor bigint not null default 0 check(refunded_minor>=0),
  fee_refunded_minor bigint not null default 0 check(fee_refunded_minor>=0),test_mode boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index marketplace_finance_shop_idx on public.marketplace_order_finance(shop_id,created_at desc);
create table public.seller_fulfillments (
  order_code text primary key references public.marketplace_order_finance(order_code),shop_id uuid not null references public.shops(id),
  state text not null default 'unfulfilled' check(state in ('unfulfilled','preparing','shipped','delivered')),
  carrier text not null default '' check(length(carrier)<=80),tracking text not null default '' check(length(tracking)<=160),updated_at timestamptz not null default now()
);
alter table public.shop_payment_accounts enable row level security;
alter table public.marketplace_order_finance enable row level security;
alter table public.seller_fulfillments enable row level security;
revoke all on public.shop_payment_accounts,public.marketplace_order_finance,public.seller_fulfillments from public,anon,authenticated;
grant select on public.shop_payment_accounts,public.marketplace_order_finance,public.seller_fulfillments to authenticated;
grant all on public.shop_payment_accounts,public.marketplace_order_finance,public.seller_fulfillments to service_role;
create policy payment_accounts_member on public.shop_payment_accounts for select to authenticated using(public.is_shop_member(shop_id));
create policy finance_member on public.marketplace_order_finance for select to authenticated using(public.is_shop_member(shop_id));
create policy fulfillment_member on public.seller_fulfillments for select to authenticated using(public.is_shop_member(shop_id));

create or replace function public.guard_legacy_checkout() returns trigger language plpgsql security definer set search_path='' as $$
declare shop_count integer;
begin
  if jsonb_typeof(new.items) is distinct from 'array' or jsonb_array_length(new.items)=0 then raise exception 'empty_order' using errcode='22023'; end if;
  select count(distinct p.shop_id) into shop_count from jsonb_array_elements(new.items) l join public.products p on p.id=l->>'id';
  if shop_count<>1 then raise exception 'one_seller_per_checkout' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(new.items) l
    left join public.products p on p.id=l->>'id' left join public.shops s on s.id=p.shop_id left join public.shop_pages sp on sp.shop_id=s.id
    left join public.shop_payment_accounts a on a.shop_id=s.id
    where p.id is null or not p.active or p.listing_status<>'published' or s.status<>'active' or sp.published is null
      or (not s.is_legacy and not coalesce(a.charges_enabled and a.payouts_enabled and a.transfers_enabled
        and a.test_mode=(new.stripe_session_id like 'cs_test_%'),false))) then
    raise exception 'seller_payments_not_enabled' using errcode='22023';
  end if;
  return new;
end;
$$;

create or replace view public.catalog_products with(security_barrier=true) as
select p.id,p.name,p.product_type,p.category,p.price,p.old_price,p.stock,p.maker,p.maker_location,p.material,p.color,
  p.occasion,p.recipients,p.moods,p.image,p.image_position,p.rating,p.reviews,p.shipping_days,p.badge,p.description,
  p.details,p.care,p.story,p.active,p.created_at,p.updated_at,p.search_vector,p.shop_id,p.listing_status,p.rating_source,p.personalizable,
  s.slug as shop_slug,s.name as shop_name,(s.is_legacy or coalesce(a.charges_enabled and a.payouts_enabled and a.transfers_enabled and a.test_mode,false)) as checkout_eligible
from public.products p join public.shops s on s.id=p.shop_id join public.shop_pages sp on sp.shop_id=s.id
left join public.shop_payment_accounts a on a.shop_id=s.id
where p.active and p.listing_status='published' and s.status='active' and sp.published is not null;

create function public.attach_order_finance(p_code text,p_shop uuid,p_account text,p_products_minor bigint,p_shipping_minor bigint) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; calculated_fee bigint;
begin
  select * into o from public.orders where code=p_code for update;
  if not found or o.status<>'pending' then raise exception 'order_not_pending'; end if;
  if round((o.subtotal-o.discount)*100)<>p_products_minor or round(o.shipping*100)<>p_shipping_minor or round(o.total*100)<>p_products_minor+p_shipping_minor then raise exception 'finance_amount_mismatch'; end if;
  if exists(select 1 from jsonb_array_elements(o.items) l join public.products p on p.id=l->>'id' where p.shop_id<>p_shop) then raise exception 'finance_shop_mismatch'; end if;
  if p_account is not null and not exists(select 1 from public.shop_payment_accounts a where a.shop_id=p_shop and a.stripe_account_id=p_account and a.test_mode=(o.stripe_session_id like 'cs_test_%') and a.charges_enabled and a.payouts_enabled and a.transfers_enabled) then raise exception 'finance_account_mismatch'; end if;
  if p_account is null and not exists(select 1 from public.shops where id=p_shop and is_legacy) then raise exception 'finance_account_required'; end if;
  calculated_fee=case when p_account is null then 0 else round(p_products_minor*550::numeric/10000)::bigint end;
  insert into public.marketplace_order_finance(order_code,shop_id,stripe_account_id,product_subtotal_minor,shipping_minor,fee_minor,seller_transfer_minor,test_mode)
    values(p_code,p_shop,p_account,p_products_minor,p_shipping_minor,calculated_fee,p_products_minor+p_shipping_minor-calculated_fee,o.stripe_session_id like 'cs_test_%');
  insert into public.seller_fulfillments(order_code,shop_id) values(p_code,p_shop);
end;
$$;

create function public.seller_orders(p_shop uuid,p_page integer default 1) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_shop_member(p_shop) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  return jsonb_build_object('total',(select count(*) from public.marketplace_order_finance f join public.orders o on o.code=f.order_code where f.shop_id=p_shop and o.status in ('paid','refunded')),
    'orders',coalesce((select jsonb_agg(row_to_json(r)) from (
      select o.code,o.customer_name,o.shipping_address,o.customer_phone,o.items,o.status,o.created_at,f.product_subtotal_minor,f.shipping_minor,f.fee_minor,f.seller_transfer_minor,f.refunded_minor,f.fee_refunded_minor,f.test_mode,ful.state,ful.carrier,ful.tracking
      from public.marketplace_order_finance f join public.orders o on o.code=f.order_code join public.seller_fulfillments ful on ful.order_code=o.code
      where f.shop_id=p_shop and o.status in ('paid','refunded') order by o.created_at desc,o.code limit 20 offset (greatest(1,least(p_page,10000))-1)*20
    ) r),'[]'::jsonb));
end;
$$;

create function public.create_marketplace_pending_order(
  p_code text,p_customer_name text,p_customer_email text,p_customer_phone text,p_shipping_address text,p_items jsonb,
  p_subtotal numeric,p_discount numeric,p_shipping numeric,p_total numeric,p_stripe_session_id text,p_user_id uuid,
  p_shop uuid,p_account text,p_products_minor bigint,p_shipping_minor bigint
) returns void language plpgsql security definer set search_path='' as $$
begin
  perform public.create_pending_order(p_code,p_customer_name,p_customer_email,p_customer_phone,p_shipping_address,p_items,p_subtotal,p_discount,p_shipping,p_total,p_stripe_session_id,p_user_id);
  perform public.attach_order_finance(p_code,p_shop,p_account,p_products_minor,p_shipping_minor);
end;
$$;
revoke all on function public.create_marketplace_pending_order(text,text,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,uuid,uuid,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.create_marketplace_pending_order(text,text,text,text,text,jsonb,numeric,numeric,numeric,numeric,text,uuid,uuid,text,bigint,bigint) to service_role;

create function public.update_seller_fulfillment(p_shop uuid,p_code text,p_state text,p_carrier text,p_tracking text) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;
begin
  if not public.can_edit_shop(p_shop) then raise exception 'shop_access_denied' using errcode='42501'; end if;
  if not exists(select 1 from public.orders o join public.marketplace_order_finance f on f.order_code=o.code where o.code=p_code and f.shop_id=p_shop and o.status='paid' and f.refunded_minor=0) then raise exception 'order_not_fulfillable' using errcode='22023'; end if;
  select state into previous from public.seller_fulfillments where order_code=p_code and shop_id=p_shop for update;
  if not found or not ((previous='unfulfilled' and p_state='preparing') or (previous='preparing' and p_state='shipped') or (previous='shipped' and p_state='delivered')) then raise exception 'invalid_fulfillment_transition' using errcode='22023'; end if;
  if p_state='shipped' and (length(trim(p_carrier))<2 or length(trim(p_tracking))<3) then raise exception 'tracking_required' using errcode='22023'; end if;
  update public.seller_fulfillments set state=p_state,carrier=p_carrier,tracking=p_tracking,updated_at=now() where order_code=p_code;
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id) values(auth.uid(),p_shop,'order.'||p_state,p_code);
end;
$$;

create function public.reconcile_order_refund(p_payment text,p_refunded bigint,p_fee_refunded bigint) returns void
language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where payment_id=p_payment and status in ('paid','refunded') for update;
  if not found then return; end if;
  if p_refunded<0 or p_refunded>round(o.total*100) or p_fee_refunded<0 then raise exception 'invalid_refund_amount'; end if;
  update public.marketplace_order_finance set refunded_minor=greatest(refunded_minor,p_refunded),fee_refunded_minor=greatest(fee_refunded_minor,p_fee_refunded),updated_at=now() where order_code=o.code;
  if p_refunded=round(o.total*100) then update public.orders set status='refunded',updated_at=now() where code=o.code; end if;
end;
$$;

revoke all on function public.attach_order_finance(text,uuid,text,bigint,bigint),public.seller_orders(uuid,integer),public.update_seller_fulfillment(uuid,text,text,text,text),public.reconcile_order_refund(text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.attach_order_finance(text,uuid,text,bigint,bigint),public.reconcile_order_refund(text,bigint,bigint) to service_role;
grant execute on function public.seller_orders(uuid,integer),public.update_seller_fulfillment(uuid,text,text,text,text) to authenticated;

create or replace function public.claim_order_email(p_order_code text default null) returns setof public.order_email_outbox
language plpgsql security definer set search_path='' as $$
declare selected_id uuid;
begin
  update public.order_email_outbox set status='uncertain',last_error='SMTP_ACKNOWLEDGEMENT_UNCERTAIN',lock_token=null
    where message->>'delivery_provider'='smtp' and status='processing' and locked_at<now()-interval '5 minutes';
  update public.order_email_outbox set status='uncertain',last_error='IDEMPOTENCY_WINDOW_EXPIRED',lock_token=null
    where status in ('failed','processing') and first_attempt_at<now()-interval '23 hours' and (status<>'processing' or locked_at<now()-interval '5 minutes');
  update public.order_email_outbox set status='uncertain',last_error='MAX_ATTEMPTS_UNCERTAIN',lock_token=null where status='processing' and attempts>=5 and locked_at<now()-interval '5 minutes';
  update public.order_email_outbox e set status='cancelled',last_error='ORDER_NO_LONGER_PAID',lock_token=null where e.status in ('pending','failed') and not exists(select 1 from public.orders o where o.code=e.order_code and o.status='paid');
  select e.id into selected_id from public.order_email_outbox e where (p_order_code is null or e.order_code=p_order_code) and e.attempts<5
    and (e.status in ('pending','failed') and e.next_attempt_at<=now() or e.status='processing' and e.locked_at<now()-interval '5 minutes')
    and exists(select 1 from public.orders o where o.code=e.order_code and o.status='paid') order by e.next_attempt_at,e.id for update of e skip locked limit 1;
  if selected_id is null then return; end if;
  return query update public.order_email_outbox set status='processing',locked_at=now(),lock_token=gen_random_uuid(),attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) where id=selected_id returning *;
end;
$$;

commit;

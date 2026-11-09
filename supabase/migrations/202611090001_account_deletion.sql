begin;

alter table public.seller_applications alter column applicant_id drop not null;
alter table public.seller_applications drop constraint seller_applications_applicant_id_fkey;
alter table public.seller_applications add constraint seller_applications_applicant_id_fkey foreign key(applicant_id) references auth.users(id) on delete set null;
alter table public.seller_fee_acceptances alter column user_id drop not null;
alter table public.seller_fee_acceptances drop constraint seller_fee_acceptances_user_id_fkey;
alter table public.seller_fee_acceptances add constraint seller_fee_acceptances_user_id_fkey foreign key(user_id) references auth.users(id) on delete set null;
alter table public.return_requests alter column buyer_id drop not null;
alter table public.return_requests drop constraint return_requests_buyer_id_fkey;
alter table public.return_requests add constraint return_requests_buyer_id_fkey foreign key(buyer_id) references auth.users(id) on delete set null;

create function public.claim_account_deletion_attempt(p_user_id uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare attempts integer;
begin
  insert into public.public_form_usage(kind,key,window_start,calls)
    values('account-deletion',p_user_id::text,date_trunc('hour',now()),1)
    on conflict(kind,key,window_start) do update set calls=public.public_form_usage.calls+1
    returning calls into attempts;
  return attempts<=5;
end;
$$;
revoke all on function public.claim_account_deletion_attempt(uuid) from public,anon,authenticated;
grant execute on function public.claim_account_deletion_attempt(uuid) to service_role;

create function public.delete_customer_account(p_user_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform id from auth.users where id=p_user_id for update;
  if not found then raise exception 'account_not_found' using errcode='P0002'; end if;
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  perform s.id from public.shops s join public.shop_memberships m on m.shop_id=s.id
    where m.user_id=p_user_id and m.role='owner' order by s.id for update of s;
  if exists(select 1 from public.shop_memberships m join public.shops s on s.id=m.shop_id
    where m.user_id=p_user_id and m.role='owner' and s.status<>'closed') then
    raise exception 'account_open_shops' using errcode='23514';
  end if;
  perform id from public.orders where user_id=p_user_id order by id for update;
  if exists(select 1 from public.orders o left join public.seller_fulfillments f on f.order_code=o.code
    where o.user_id=p_user_id and (o.status='pending' or (o.status='paid' and coalesce(f.state,'unfulfilled')<>'delivered'))) then
    raise exception 'account_open_orders' using errcode='23514';
  end if;
  if exists(select 1 from public.return_requests where buyer_id=p_user_id and status in ('submitted','reviewing')) then
    raise exception 'account_open_returns' using errcode='23514';
  end if;
  if exists(select 1 from public.shop_memberships m join public.marketplace_order_finance f on f.shop_id=m.shop_id
    join public.orders o on o.code=f.order_code left join public.seller_fulfillments ful on ful.order_code=o.code
    where m.user_id=p_user_id and m.role='owner'
      and (o.status='pending' or (o.status='paid' and coalesce(ful.state,'unfulfilled')<>'delivered'))) then
    raise exception 'account_open_orders' using errcode='23514';
  end if;
  if exists(select 1 from public.shop_memberships m join public.marketplace_order_finance f on f.shop_id=m.shop_id
    join public.return_requests r on r.order_code=f.order_code
    where m.user_id=p_user_id and m.role='owner' and r.status in ('submitted','reviewing')) then
    raise exception 'account_open_returns' using errcode='23514';
  end if;
  delete from public.product_reviews where buyer_id=p_user_id;
  delete from public.shop_memberships where user_id=p_user_id;
  delete from public.newsletter_subscribers where lower(email)=(select lower(email) from auth.users where id=p_user_id);
  delete from public.public_form_usage where kind='account-deletion' and key=p_user_id::text;
  delete from auth.users where id=p_user_id;
end;
$$;
revoke all on function public.delete_customer_account(uuid) from public,anon,authenticated;
grant execute on function public.delete_customer_account(uuid) to service_role;

commit;

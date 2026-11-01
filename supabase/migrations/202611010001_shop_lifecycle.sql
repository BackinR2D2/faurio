begin;

create function public.close_owned_shop(p_shop_id uuid,p_confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare target public.shops%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.shop_memberships where shop_id=p_shop_id and user_id=auth.uid() and role='owner' and revoked_at is null) then
    raise exception 'shop_owner_required' using errcode='42501';
  end if;
  select * into target from public.shops where id=p_shop_id for update;
  if not found or target.is_legacy then raise exception 'shop_closure_not_allowed' using errcode='22023'; end if;
  if trim(p_confirmation) is distinct from target.slug then raise exception 'shop_confirmation_mismatch' using errcode='22023'; end if;
  if target.status='closed' then return; end if;
  perform id from public.products where shop_id=p_shop_id order by id for update;
  if exists(
    select 1 from public.marketplace_order_finance f join public.orders o on o.code=f.order_code
    left join public.seller_fulfillments ful on ful.order_code=o.code
    where f.shop_id=p_shop_id and (o.status='pending' or (o.status='paid' and coalesce(ful.state,'unfulfilled')<>'delivered'))
  ) then raise exception 'shop_open_orders' using errcode='23514'; end if;
  if exists(select 1 from public.return_requests r join public.marketplace_order_finance f on f.order_code=r.order_code where f.shop_id=p_shop_id and r.status in ('submitted','reviewing')) then
    raise exception 'shop_open_returns' using errcode='23514';
  end if;
  update public.shops set status='closed',updated_at=now() where id=p_shop_id;
  update public.shop_pages set published=null,published_at=null,revision=revision+1,updated_at=now() where shop_id=p_shop_id;
  update public.products set active=false,listing_status='archived',updated_at=now() where shop_id=p_shop_id;
  insert into public.marketplace_audit_log(actor_id,shop_id,action,subject_id,reason)
    values(auth.uid(),p_shop_id,'shop.closed',p_shop_id::text,'Închis de proprietar. Istoricul comenzilor este păstrat.');
end;
$$;
revoke all on function public.close_owned_shop(uuid,text) from public,anon,authenticated;
grant execute on function public.close_owned_shop(uuid,text) to authenticated;

create or replace function public.apply_for_shop(p_name text,p_slug text,p_country text,p_location text,p_terms_version text) returns uuid
language plpgsql security definer set search_path='' as $$
declare shop uuid; who uuid := auth.uid();
begin
  if who is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_terms_version<>'seller-2026-10' then raise exception 'seller_terms_required' using errcode='22023'; end if;
  if p_slug in ('admin','studio','api','account','catalog','makers','sell','checkout','fir-de-poveste','faurio') then raise exception 'reserved_slug' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtext(who::text));
  if (select count(*) from public.shop_memberships m join public.shops s on s.id=m.shop_id where m.user_id=who and m.role='owner' and m.revoked_at is null and s.status<>'closed')>=3 then
    raise exception 'shop_limit_reached' using errcode='22023';
  end if;
  insert into public.shops(name,slug,country,location) values(p_name,p_slug,p_country,p_location) returning id into shop;
  insert into public.shop_memberships(shop_id,user_id,role) values(shop,who,'owner');
  insert into public.shop_pages(shop_id,draft) values(shop,public.default_shop_layout(p_name));
  insert into public.seller_applications(shop_id,applicant_id,terms_version) values(shop,who,p_terms_version);
  insert into public.marketplace_audit_log(actor_id,shop_id,action) values(who,shop,'shop.applied');
  return shop;
end;
$$;

commit;

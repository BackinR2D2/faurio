begin;

create table public.order_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique references public.orders(code),
  snapshot jsonb not null,
  message jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','blocked','uncertain','cancelled')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  lock_token uuid,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index order_email_outbox_due_idx on public.order_email_outbox(next_attempt_at) where status in ('pending','failed','processing');
alter table public.order_email_outbox enable row level security;
revoke all on public.order_email_outbox from public,anon,authenticated;
grant select on public.order_email_outbox to service_role;

create function public.enqueue_paid_order_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'paid' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status = 'paid' then return new; end if;
  end if;
  insert into public.order_email_outbox(order_code,snapshot)
  values(new.code,jsonb_build_object('code',new.code,'customer_name',new.customer_name,'customer_email',new.customer_email,
    'shipping_address',new.shipping_address,'items',new.items,'subtotal',new.subtotal,'discount',new.discount,
    'shipping',new.shipping,'total',new.total,'invoice_url',new.invoice_url,'test_mode',coalesce(new.stripe_session_id not like 'cs_live_%',true)))
  on conflict(order_code) do nothing;
  return new;
end;
$$;
create trigger orders_enqueue_confirmation after insert or update of status on public.orders for each row execute function public.enqueue_paid_order_email();
revoke all on function public.enqueue_paid_order_email() from public,anon,authenticated;

create function public.claim_order_email(p_order_code text default null) returns setof public.order_email_outbox
language plpgsql security definer set search_path = '' as $$
declare selected_id uuid;
begin
  update public.order_email_outbox set status='uncertain',last_error='IDEMPOTENCY_WINDOW_EXPIRED',lock_token=null
    where status in ('failed','processing') and first_attempt_at < now()-interval '23 hours'
      and (status <> 'processing' or locked_at < now()-interval '5 minutes');
  update public.order_email_outbox set status='uncertain',last_error='MAX_ATTEMPTS_UNCERTAIN',lock_token=null
    where status='processing' and attempts>=5 and locked_at<now()-interval '5 minutes';
  update public.order_email_outbox e set status='cancelled',last_error='ORDER_NO_LONGER_PAID',lock_token=null
    where e.status in ('pending','failed') and not exists(select 1 from public.orders o where o.code=e.order_code and o.status='paid');
  select e.id into selected_id from public.order_email_outbox e
    where (p_order_code is null or e.order_code=p_order_code) and e.attempts<5
      and (e.status in ('pending','failed') and e.next_attempt_at<=now() or e.status='processing' and e.locked_at<now()-interval '5 minutes')
      and exists(select 1 from public.orders o where o.code=e.order_code and o.status='paid')
    order by e.next_attempt_at,e.id for update of e skip locked limit 1;
  if selected_id is null then return; end if;
  return query update public.order_email_outbox set status='processing',locked_at=now(),lock_token=gen_random_uuid(),
    attempts=attempts+1,first_attempt_at=coalesce(first_attempt_at,now()) where id=selected_id returning *;
end;
$$;

create function public.prepare_order_email(p_id uuid,p_token uuid,p_message jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare prepared jsonb;
begin
  if coalesce(jsonb_typeof(p_message),'null')<>'object' or octet_length(p_message::text)>200000 then raise exception 'invalid_email_message'; end if;
  update public.order_email_outbox set message=coalesce(message,p_message)
    where id=p_id and status='processing' and lock_token=p_token returning message into prepared;
  if not found then raise exception 'email_claim_lost'; end if;
  return prepared;
end;
$$;

create function public.finish_order_email(p_id uuid,p_token uuid,p_status text,p_provider_id text default null,p_error text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('sent','failed','blocked','uncertain') then raise exception 'invalid_email_state'; end if;
  if p_status='sent' and coalesce(length(p_provider_id),0) not between 1 and 200 then raise exception 'invalid_email_receipt'; end if;
  if p_error is not null and p_error !~ '^[A-Z0-9_]{1,80}$' then raise exception 'invalid_email_error'; end if;
  update public.order_email_outbox set status=case when p_status='failed' and attempts>=5 then 'blocked' else p_status end,
    provider_id=coalesce(p_provider_id,provider_id),last_error=p_error,sent_at=case when p_status='sent' then now() else sent_at end,
    next_attempt_at=now()+make_interval(secs => least(3600,60*power(2,attempts)::integer)),lock_token=null,locked_at=null
    where id=p_id and status='processing' and lock_token=p_token;
  if not found then raise exception 'email_claim_lost'; end if;
end;
$$;

revoke all on function public.claim_order_email(text) from public,anon,authenticated;
revoke all on function public.prepare_order_email(uuid,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.finish_order_email(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_order_email(text) to service_role;
grant execute on function public.prepare_order_email(uuid,uuid,jsonb) to service_role;
grant execute on function public.finish_order_email(uuid,uuid,text,text,text) to service_role;

commit;

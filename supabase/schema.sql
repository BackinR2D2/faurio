create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  product_type text not null default 'Produs',
  category text not null,
  price integer not null check (price >= 0),
  old_price integer,
  stock integer not null default 0 check (stock >= 0),
  maker text not null default 'Atelier local',
  maker_location text not null default 'România',
  material text not null default '',
  color text not null default '',
  occasion text[] not null default '{}',
  recipients text[] not null default '{}',
  moods text[] not null default '{}',
  image text not null default '/products/ceramica-luna.avif',
  image_position text,
  rating numeric(2,1) not null default 5 check (rating between 0 and 5),
  reviews integer not null default 0 check (reviews >= 0),
  shipping_days integer not null default 3 check (shipping_days > 0),
  badge text,
  description text not null default '',
  details text[] not null default '{}',
  care text not null default '',
  story text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists product_type text not null default 'Produs';
alter table public.products add column if not exists old_price integer;
alter table public.products add column if not exists maker text not null default 'Atelier local';
alter table public.products add column if not exists maker_location text not null default 'România';
alter table public.products add column if not exists material text not null default '';
alter table public.products add column if not exists color text not null default '';
alter table public.products add column if not exists occasion text[] not null default '{}';
alter table public.products add column if not exists recipients text[] not null default '{}';
alter table public.products add column if not exists moods text[] not null default '{}';
alter table public.products add column if not exists image text not null default '/products/ceramica-luna.avif';
alter table public.products add column if not exists image_position text;
alter table public.products add column if not exists rating numeric(2,1) not null default 5;
alter table public.products add column if not exists reviews integer not null default 0;
alter table public.products add column if not exists shipping_days integer not null default 3;
alter table public.products add column if not exists badge text;
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists details text[] not null default '{}';
alter table public.products add column if not exists care text not null default '';
alter table public.products add column if not exists story text not null default '';
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.products add column if not exists search_vector tsvector generated always as (
  to_tsvector('simple'::regconfig,
    coalesce(name, '') || ' ' || coalesce(product_type, '') || ' ' || coalesce(category, '') || ' ' ||
    coalesce(maker, '') || ' ' || coalesce(material, '') || ' ' || coalesce(color, '') || ' ' ||
    coalesce(description, '')
  )
) stored;

create index if not exists products_search_idx on public.products using gin(search_vector);
create index if not exists products_catalog_idx on public.products(active, category, price, rating desc);
create index if not exists products_type_idx on public.products(product_type) where active;
create index if not exists products_created_idx on public.products(created_at desc) where active;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  county text not null default '',
  postal_code text not null default '',
  newsletter boolean not null default false,
  gifts boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  shipping_address text not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null check (total >= 0),
  payment_id text,
  stripe_session_id text unique,
  invoice_url text,
  status text not null default 'pending' check (status in ('pending','paid','cancelled','refunded')),
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_phone text not null default '';
alter table public.orders add column if not exists subtotal numeric(10,2) not null default 0;
alter table public.orders add column if not exists discount numeric(10,2) not null default 0;
alter table public.orders add column if not exists shipping numeric(10,2) not null default 0;
alter table public.orders add column if not exists stripe_session_id text unique;
alter table public.orders add column if not exists invoice_url text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders alter column total type numeric(10,2) using total::numeric;
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status, created_at desc);

create table if not exists public.promotions (
  code text primary key,
  discount_percent integer not null check (discount_percent between 1 and 100),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default '2099-12-31 23:59:59+00'
);

insert into public.promotions(code, discount_percent, active, starts_at, ends_at)
values ('POVESTE10', 10, true, now() - interval '1 day', now() + interval '10 years')
on conflict (code) do update set discount_percent = excluded.discount_percent, active = excluded.active, starts_at = excluded.starts_at, ends_at = excluded.ends_at;

create table if not exists public.user_shop_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cart jsonb not null default '[]'::jsonb,
  favorites text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id, email, name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'Client'), '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile_for_new_user();

create or replace function public.create_pending_order(
  p_code text, p_customer_name text, p_customer_email text, p_customer_phone text, p_shipping_address text,
  p_items jsonb, p_subtotal numeric, p_discount numeric, p_shipping numeric, p_total numeric,
  p_stripe_session_id text, p_user_id uuid default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  line jsonb;
  changed integer;
begin
  if jsonb_array_length(p_items) < 1 then raise exception 'empty_order'; end if;
  for line in select * from jsonb_array_elements(p_items)
  loop
    update public.products
      set stock = stock - greatest(1, (line ->> 'quantity')::integer), updated_at = now()
      where id = line ->> 'id' and active and stock >= greatest(1, (line ->> 'quantity')::integer);
    get diagnostics changed = row_count;
    if changed <> 1 then raise exception 'insufficient_stock:%', line ->> 'id'; end if;
  end loop;

  insert into public.orders(
    code, customer_name, customer_email, customer_phone, shipping_address, items, subtotal, discount,
    shipping, total, payment_id, stripe_session_id, status, user_id
  ) values (
    p_code, p_customer_name, p_customer_email, p_customer_phone, p_shipping_address, p_items, p_subtotal,
    p_discount, p_shipping, p_total, p_stripe_session_id, p_stripe_session_id, 'pending', p_user_id
  );
end;
$$;

create or replace function public.complete_paid_order(p_code text, p_payment_id text, p_total numeric, p_invoice_url text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_order public.orders%rowtype;
begin
  select * into current_order from public.orders where code = p_code for update;
  if not found then raise exception 'order_not_found'; end if;
  if current_order.status = 'paid' then return; end if;
  if current_order.status <> 'pending' then raise exception 'order_not_pending'; end if;
  if abs(current_order.total - p_total) > 0.01 then raise exception 'payment_total_mismatch'; end if;

  update public.orders set status = 'paid', payment_id = p_payment_id, invoice_url = p_invoice_url, updated_at = now() where code = p_code;
end;
$$;

create or replace function public.cancel_pending_order(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_order public.orders%rowtype;
  line jsonb;
begin
  select * into current_order from public.orders where code = p_code for update;
  if not found or current_order.status <> 'pending' then return; end if;
  for line in select * from jsonb_array_elements(current_order.items)
  loop
    update public.products set stock = stock + greatest(1, (line ->> 'quantity')::integer), updated_at = now() where id = line ->> 'id';
  end loop;
  update public.orders set status = 'cancelled', updated_at = now() where code = p_code;
end;
$$;

revoke all on function public.create_pending_order(text, text, text, text, text, jsonb, numeric, numeric, numeric, numeric, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_paid_order(text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.cancel_pending_order(text) from public, anon, authenticated;
grant execute on function public.create_pending_order(text, text, text, text, text, jsonb, numeric, numeric, numeric, numeric, text, uuid) to service_role;
grant execute on function public.complete_paid_order(text, text, numeric, text) to service_role;
grant execute on function public.cancel_pending_order(text) to service_role;

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.promotions enable row level security;
alter table public.user_shop_state enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products for select using (active);
drop policy if exists profiles_own_read on public.profiles;
create policy profiles_own_read on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists orders_own_read on public.orders;
create policy orders_own_read on public.orders for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists orders_own_insert on public.orders;
drop policy if exists shop_state_own_read on public.user_shop_state;
create policy shop_state_own_read on public.user_shop_state for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists shop_state_own_insert on public.user_shop_state;
create policy shop_state_own_insert on public.user_shop_state for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists shop_state_own_update on public.user_shop_state;
create policy shop_state_own_update on public.user_shop_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;
revoke all on table public.promotions from anon, authenticated;
revoke all on table public.user_shop_state from anon, authenticated;
grant select, insert, update on table public.user_shop_state to authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.newsletter_subscribers from anon, authenticated;

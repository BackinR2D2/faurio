create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price integer not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_name text not null,
  customer_email text not null,
  shipping_address text not null,
  items jsonb not null default '[]'::jsonb,
  total integer not null check (total >= 0),
  payment_id text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;

create policy "products are publicly readable"
on public.products for select using (true);

-- Inserările de comenzi se fac numai server-side cu service role.

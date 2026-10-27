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
  user_id text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists user_id text;

create table if not exists public.profiles (
  user_id text primary key,
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

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.profiles enable row level security;

create policy "products are publicly readable"
on public.products for select using (true);

-- Inserările de comenzi se fac numai server-side cu service role.
-- Profilurile se citesc și se actualizează numai server-side, după identitatea Sites.

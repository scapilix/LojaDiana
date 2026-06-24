-- ============================================================
-- Loja Diana — SaaS Multi-Tenant Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. STORES (tenants)
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,          -- used in URLs / subdomains
  plan        text not null default 'basico' check (plan in ('basico', 'pro', 'plus')),
  plan_status text not null default 'trial'  check (plan_status in ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  owner_id    uuid references auth.users(id) on delete cascade,
  settings    jsonb default '{}'::jsonb,     -- storeName, whatsapp, theme, etc.
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. STORE MEMBERS (users per tenant)
create table if not exists public.store_members (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid references public.stores(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  role       text not null default 'vendedor' check (role in ('admin', 'vendedor')),
  created_at timestamptz default now(),
  unique(store_id, user_id)
);

-- 3. ORDERS (encomendas) — multi-tenant
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references public.stores(id) on delete cascade,
  external_id   text,                        -- original id_venda from Excel
  customer_name text,
  customer_id   text,
  date          date,
  total         numeric(10,2),
  profit        numeric(10,2),
  payment_type  text,
  delivery_type text,
  status        text default 'pending',
  notes         text,
  items         jsonb default '[]'::jsonb,
  raw           jsonb default '{}'::jsonb,   -- original row for backwards compat
  created_at    timestamptz default now()
);

-- 4. CUSTOMERS — multi-tenant
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references public.stores(id) on delete cascade,
  external_id   text,
  name          text,
  phone         text,
  email         text,
  location      text,
  notes         text,
  raw           jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

-- 5. PRODUCTS CATALOG — multi-tenant
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references public.stores(id) on delete cascade,
  ref           text,
  name          text not null,
  pvp           numeric(10,2),
  cost          numeric(10,2),
  iva           numeric(5,2) default 23,
  supplier      text,
  category      text,
  image_url     text,
  published     boolean default false,
  featured      boolean default false,
  stock_qty     integer default 0,
  variations    jsonb default '[]'::jsonb,   -- sizes, colors, etc.
  extra         jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 6. EXPENSES — multi-tenant
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references public.stores(id) on delete cascade,
  date        date,
  description text,
  amount      numeric(10,2),
  category    text,
  created_at  timestamptz default now()
);

-- 7. POS SESSIONS — multi-tenant
create table if not exists public.pos_sessions (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references public.stores(id) on delete cascade,
  user_id     uuid references auth.users(id),
  opened_at   timestamptz default now(),
  closed_at   timestamptz,
  cash_open   numeric(10,2) default 0,
  cash_close  numeric(10,2),
  total_sales numeric(10,2) default 0
);

-- 8. POS SALES — multi-tenant
create table if not exists public.pos_sales (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references public.stores(id) on delete cascade,
  session_id    uuid references public.pos_sessions(id),
  user_id       uuid references auth.users(id),
  items         jsonb not null default '[]'::jsonb,
  total         numeric(10,2),
  payment_type  text,
  customer_name text,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_orders_store      on public.orders(store_id);
create index if not exists idx_customers_store   on public.customers(store_id);
create index if not exists idx_products_store    on public.products(store_id);
create index if not exists idx_expenses_store    on public.expenses(store_id);
create index if not exists idx_pos_sales_store   on public.pos_sales(store_id);
create index if not exists idx_members_store     on public.store_members(store_id);
create index if not exists idx_members_user      on public.store_members(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: returns the store_id for the current user (first membership)
create or replace function public.my_store_id()
returns uuid language sql stable security definer as $$
  select store_id from public.store_members
  where user_id = auth.uid()
  limit 1;
$$;

-- stores: owner or member can read; owner can update
alter table public.stores enable row level security;

create policy "stores: member read" on public.stores
  for select using (
    id in (select store_id from public.store_members where user_id = auth.uid())
  );

create policy "stores: owner update" on public.stores
  for update using (owner_id = auth.uid());

-- store_members: members can read their own store's members
alter table public.store_members enable row level security;

create policy "members: read own store" on public.store_members
  for select using (store_id = my_store_id());

-- orders
alter table public.orders enable row level security;

create policy "orders: member CRUD" on public.orders
  for all using (store_id = my_store_id());

-- customers
alter table public.customers enable row level security;

create policy "customers: member CRUD" on public.customers
  for all using (store_id = my_store_id());

-- products
alter table public.products enable row level security;

create policy "products: member CRUD" on public.products
  for all using (store_id = my_store_id());

-- expenses
alter table public.expenses enable row level security;

create policy "expenses: member CRUD" on public.expenses
  for all using (store_id = my_store_id());

-- pos_sessions
alter table public.pos_sessions enable row level security;

create policy "pos_sessions: member CRUD" on public.pos_sessions
  for all using (store_id = my_store_id());

-- pos_sales
alter table public.pos_sales enable row level security;

create policy "pos_sales: member CRUD" on public.pos_sales
  for all using (store_id = my_store_id());

-- ============================================================
-- TRIGGER: auto-update updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- FUNCTION: create_store_on_signup
-- Called after a user registers to create their store + membership
-- ============================================================
create or replace function public.create_store_for_new_user(
  p_user_id  uuid,
  p_name     text,
  p_plan     text default 'basico'
)
returns uuid language plpgsql security definer as $$
declare
  v_store_id uuid;
  v_slug     text;
begin
  -- generate slug from store name
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);

  insert into public.stores(name, slug, plan, owner_id)
  values (p_name, v_slug, p_plan, p_user_id)
  returning id into v_store_id;

  insert into public.store_members(store_id, user_id, role)
  values (v_store_id, p_user_id, 'admin');

  return v_store_id;
end;
$$;

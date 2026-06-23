-- supabase_online_orders.sql
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

create table if not exists public.online_orders (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid references public.stores(id) on delete cascade,
  store_slug   text,
  ref          text not null,
  nome_cliente text,
  email        text,
  telefone     text,
  morada       text,
  cidade       text,
  codigo_postal text,
  items        jsonb default '[]'::jsonb,
  total        numeric(10,2),
  portes       numeric(10,2) default 0,
  metodo_envio text default 'Continental',
  status       text default 'Aguarda pagamento',
  notas        text,
  data_venda   date default current_date,
  created_at   timestamptz default now()
);

alter table public.online_orders enable row level security;

-- Anyone (including anonymous) can insert orders
create policy "anon_insert_online_orders"
  on public.online_orders for insert
  to anon, authenticated
  with check (true);

-- Authenticated users can read all orders (for now; tighten per store_id in production)
create policy "auth_read_online_orders"
  on public.online_orders for select
  to authenticated
  using (true);

-- Authenticated users can update status
create policy "auth_update_online_orders"
  on public.online_orders for update
  to authenticated
  using (true);

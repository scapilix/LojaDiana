-- ============================================================
-- Loja Diana — SaaS Migration
-- Corra este ficheiro no Supabase SQL Editor
-- Renomeia tabelas antigas e cria o schema multi-tenant
-- ============================================================

-- 1. Arquivar tabelas antigas (renomear para _legacy)
--    Se não existirem, as instruções são ignoradas com DO $$ ... $$

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='orders') THEN
    ALTER TABLE public.orders RENAME TO orders_legacy;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='order_items') THEN
    ALTER TABLE public.order_items RENAME TO order_items_legacy;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='loja_compras') THEN
    ALTER TABLE public.loja_compras RENAME TO loja_compras_legacy;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname='public' AND tablename='loja_users') THEN
    ALTER TABLE public.loja_users RENAME TO loja_users_legacy;
  END IF;
END $$;

-- ============================================================
-- 2. STORES (tenants)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  plan          text NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'pro', 'plus')),
  plan_status   text NOT NULL DEFAULT 'trial'  CHECK (plan_status IN ('trial', 'active', 'past_due', 'cancelled')),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  owner_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  settings      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 3. STORE MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- ============================================================
-- 4. ORDERS (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  external_id   text,
  customer_name text,
  customer_id   text,
  date          date,
  total         numeric(10,2),
  profit        numeric(10,2),
  payment_type  text,
  delivery_type text,
  status        text DEFAULT 'pending',
  notes         text,
  items         jsonb DEFAULT '[]'::jsonb,
  raw           jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 5. CUSTOMERS (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  external_id text,
  name        text,
  phone       text,
  email       text,
  location    text,
  notes       text,
  raw         jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 6. PRODUCTS (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  ref         text,
  name        text NOT NULL,
  pvp         numeric(10,2),
  cost        numeric(10,2),
  iva         numeric(5,2) DEFAULT 23,
  supplier    text,
  category    text,
  image_url   text,
  published   boolean DEFAULT false,
  featured    boolean DEFAULT false,
  stock_qty   integer DEFAULT 0,
  variations  jsonb DEFAULT '[]'::jsonb,
  extra       jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 7. EXPENSES (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  date        date,
  description text,
  amount      numeric(10,2),
  category    text,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 8. POS SESSIONS (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id),
  opened_at   timestamptz DEFAULT now(),
  closed_at   timestamptz,
  cash_open   numeric(10,2) DEFAULT 0,
  cash_close  numeric(10,2),
  total_sales numeric(10,2) DEFAULT 0
);

-- ============================================================
-- 9. POS SALES (multi-tenant)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  session_id    uuid REFERENCES public.pos_sessions(id),
  user_id       uuid REFERENCES auth.users(id),
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,
  total         numeric(10,2),
  payment_type  text,
  customer_name text,
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_store      ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store   ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store    ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_store    ON public.expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_store   ON public.pos_sales(store_id);
CREATE INDEX IF NOT EXISTS idx_members_store     ON public.store_members(store_id);
CREATE INDEX IF NOT EXISTS idx_members_user      ON public.store_members(user_id);

-- ============================================================
-- HELPER FUNCTION (security definer — bypasses RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.my_store_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT store_id FROM public.store_members
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stores: member read"   ON public.stores;
DROP POLICY IF EXISTS "stores: owner update"  ON public.stores;

CREATE POLICY "stores: member read" ON public.stores
  FOR SELECT USING (
    id IN (SELECT store_id FROM public.store_members WHERE user_id = auth.uid())
  );
CREATE POLICY "stores: owner update" ON public.stores
  FOR UPDATE USING (owner_id = auth.uid());

-- store_members
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members: read own store" ON public.store_members;

CREATE POLICY "members: read own store" ON public.store_members
  FOR SELECT USING (store_id = public.my_store_id());

-- orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders: member CRUD" ON public.orders;

CREATE POLICY "orders: member CRUD" ON public.orders
  FOR ALL USING (store_id = public.my_store_id());

-- customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers: member CRUD" ON public.customers;

CREATE POLICY "customers: member CRUD" ON public.customers
  FOR ALL USING (store_id = public.my_store_id());

-- products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products: member CRUD" ON public.products;

CREATE POLICY "products: member CRUD" ON public.products
  FOR ALL USING (store_id = public.my_store_id());

-- expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses: member CRUD" ON public.expenses;

CREATE POLICY "expenses: member CRUD" ON public.expenses
  FOR ALL USING (store_id = public.my_store_id());

-- pos_sessions
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_sessions: member CRUD" ON public.pos_sessions;

CREATE POLICY "pos_sessions: member CRUD" ON public.pos_sessions
  FOR ALL USING (store_id = public.my_store_id());

-- pos_sales
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_sales: member CRUD" ON public.pos_sales;

CREATE POLICY "pos_sales: member CRUD" ON public.pos_sales
  FOR ALL USING (store_id = public.my_store_id());

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN new.updated_at = now(); RETURN new; END;
$$;

DROP TRIGGER IF EXISTS stores_updated_at   ON public.stores;
DROP TRIGGER IF EXISTS products_updated_at ON public.products;

CREATE TRIGGER stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- FUNCTION: criar loja ao fazer registo
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_store_for_new_user(
  p_user_id uuid,
  p_name    text,
  p_plan    text DEFAULT 'basico'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_store_id uuid;
  v_slug     text;
BEGIN
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.stores(name, slug, plan, owner_id)
  VALUES (p_name, v_slug, p_plan, p_user_id)
  RETURNING id INTO v_store_id;

  INSERT INTO public.store_members(store_id, user_id, role)
  VALUES (v_store_id, p_user_id, 'admin');

  RETURN v_store_id;
END;
$$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('stores','store_members','orders','customers','products','expenses','pos_sessions','pos_sales')
ORDER BY tablename;

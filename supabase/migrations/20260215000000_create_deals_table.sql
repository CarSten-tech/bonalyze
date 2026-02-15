
-- Deals table for storing supermarket offers
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store text NOT NULL DEFAULT 'rewe',
  product_name text NOT NULL,
  brand text,
  ean text,
  price numeric(10,2) NOT NULL,
  grammage text,
  category text,
  image_url text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast category filtering
CREATE INDEX IF NOT EXISTS idx_deals_category ON public.deals (category);

-- Index for searching by name
CREATE INDEX IF NOT EXISTS idx_deals_product_name ON public.deals USING gin (to_tsvector('german', product_name));

-- Index for store filtering
CREATE INDEX IF NOT EXISTS idx_deals_store ON public.deals (store);

-- RLS
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Everyone can read deals (public data)
-- Use DO block to avoid error if policy exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deals_select_all') THEN
        CREATE POLICY "deals_select_all" ON public.deals FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deals_insert_service') THEN
        CREATE POLICY "deals_insert_service" ON public.deals FOR INSERT WITH CHECK (auth.role() = 'service_role');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'deals_delete_service') THEN
        CREATE POLICY "deals_delete_service" ON public.deals FOR DELETE USING (auth.role() = 'service_role');
    END IF;
END $$;

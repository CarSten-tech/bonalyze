-- Create deals table for storing scraped offers
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    price NUMERIC NOT NULL,     -- Current price
    original_price NUMERIC,     -- Original price (if known, for strike-through)
    brand TEXT,
    market TEXT NOT NULL,       -- e.g. 'REWE'
    category TEXT,
    description TEXT,
    image_url TEXT,
    
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Metadata from source (e.g. source ID)
    source_id TEXT,
    source_url TEXT
);

-- Index for faster lookups by market and product name
CREATE INDEX IF NOT EXISTS idx_deals_market_product ON public.deals(market, product_name);
CREATE INDEX IF NOT EXISTS idx_deals_valid_until ON public.deals(valid_until);

-- RLS Policies
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Everyone can read deals
CREATE POLICY "Everyone can read deals" ON public.deals
    FOR SELECT TO authenticated, anon
    USING (true);

-- Only service role can insert/update (Edges Functions)
-- (Implicitly denied for anon/authenticated if no policy exists)

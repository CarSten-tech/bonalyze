-- Migration: Database Optimizations for Offers
-- Description: Adds indices for performant validity filtering and freshness sorting.
-- Author: Bonalyze CTO

-- Add index for validity pruning
CREATE INDEX IF NOT EXISTS idx_offers_valid_until ON public.offers(valid_until);

-- Add index for freshness sorting
CREATE INDEX IF NOT EXISTS idx_offers_scraped_at ON public.offers(scraped_at DESC);

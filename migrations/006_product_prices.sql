-- Migration: 006_product_prices.sql
-- Feature: PROJ-17 Product Price Database
-- Created: 2026-02-04

-- ============================================
-- 1. ENHANCE PRODUCTS TABLE
-- ============================================

-- Add household link if not exists (products were global/personal, now they serve household price tracking)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'household_id') THEN
    ALTER TABLE products ADD COLUMN household_id UUID REFERENCES households(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add price fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_price_cents INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMPTZ;

-- Add unique constraint for UPSERT capability
ALTER TABLE products ADD CONSTRAINT uk_products_household_name UNIQUE (household_id, name);

-- Add index for finding products within a household by name (for swift lookup during receipt scan)
-- CREATE INDEX ... (Redundant with Unique Constraint usually, but good for partials? Unique is enough)


-- ============================================
-- 2. RLS POLICIES FOR PRODUCTS (UPDATE)
-- ============================================
-- Ensure RLS allows household members to upsert products

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they conflict (or simple create if not exists style for new household logic)
-- Assuming prior policies were based on created_by. We now want household access.

CREATE POLICY products_select_household ON products
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
    OR household_id IS NULL -- Keep access to global/template products if any
  );

CREATE POLICY products_insert_household ON products
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY products_update_household ON products
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

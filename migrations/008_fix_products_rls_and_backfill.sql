-- Migration to fix RLS policies for products and backfill data
-- Date: 2026-02-04
-- Author: Agent

-- 1. Fix RLS Policies for products table
DROP POLICY IF EXISTS "products_select_household" ON "products";
DROP POLICY IF EXISTS "products_insert_household" ON "products";
DROP POLICY IF EXISTS "products_update_household" ON "products";
DROP POLICY IF EXISTS "products_select_all" ON "products";
DROP POLICY IF EXISTS "products_insert_authenticated" ON "products";
DROP POLICY IF EXISTS "products_update_own" ON "products";
DROP POLICY IF EXISTS "products_delete_own" ON "products";

CREATE POLICY "products_select_auth" ON "products" FOR SELECT TO authenticated
USING (
  household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid()) 
  OR household_id IS NULL -- Allow generic products
);

CREATE POLICY "products_insert_auth" ON "products" FOR INSERT TO authenticated
WITH CHECK (
  household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
);

CREATE POLICY "products_update_auth" ON "products" FOR UPDATE TO authenticated
USING (
  household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
)
WITH CHECK (
  household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
);

-- 2. Backfill products from existing receipts
-- This restores data that failed to save to the products table due to RLS
INSERT INTO products (household_id, name, last_price_cents, price_updated_at)
SELECT DISTINCT ON (r.household_id, ri.product_name)
    r.household_id,
    ri.product_name,
    ri.price_cents,
    r.created_at
FROM receipt_items ri
JOIN receipts r ON ri.receipt_id = r.id
WHERE r.household_id IS NOT NULL 
  AND ri.product_name IS NOT NULL 
  AND ri.product_name != ''
ORDER BY r.household_id, ri.product_name, r.created_at DESC
ON CONFLICT (household_id, name) DO UPDATE
SET last_price_cents = EXCLUDED.last_price_cents,
    price_updated_at = EXCLUDED.price_updated_at;

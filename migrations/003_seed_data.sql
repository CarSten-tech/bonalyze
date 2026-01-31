-- ============================================================================
-- BONALYZE DATABASE SCHEMA - MIGRATION 003: SEED DATA
-- ============================================================================
-- Description: Seed data for merchants, products, and demo receipts
-- Version: 1.0.0
-- Date: 2026-01-31
-- ============================================================================
-- IMPORTANT: This migration uses ON CONFLICT DO NOTHING for idempotency
--            Running it multiple times will not create duplicate entries
-- ============================================================================

-- ============================================================================
-- 1. SEED MERCHANTS
-- ============================================================================
-- Pre-populate common German grocery stores
-- Using fixed UUIDs for consistent references across environments
-- ============================================================================

INSERT INTO merchants (id, name, logo_url, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'REWE', NULL, NULL),
  ('00000000-0000-0000-0000-000000000002', 'LIDL', NULL, NULL),
  ('00000000-0000-0000-0000-000000000003', 'ALDI SÜD', NULL, NULL),
  ('00000000-0000-0000-0000-000000000004', 'EDEKA', NULL, NULL),
  ('00000000-0000-0000-0000-000000000005', 'Kaufland', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. SEED PRODUCTS
-- ============================================================================
-- Pre-populate common grocery items with categories
-- Using fixed UUIDs for consistent references across environments
-- ============================================================================

INSERT INTO products (id, name, category, unit, created_by)
VALUES
  -- Food - Bakery
  ('10000000-0000-0000-0000-000000000001', 'Brot', 'Food', 'Stück', NULL),
  ('10000000-0000-0000-0000-000000000002', 'Brötchen', 'Food', 'Stück', NULL),
  ('10000000-0000-0000-0000-000000000003', 'Toast', 'Food', 'Packung', NULL),

  -- Food - Dairy
  ('10000000-0000-0000-0000-000000000004', 'Milch', 'Food', 'L', NULL),
  ('10000000-0000-0000-0000-000000000005', 'Butter', 'Food', 'Packung', NULL),
  ('10000000-0000-0000-0000-000000000006', 'Joghurt', 'Food', 'Becher', NULL),
  ('10000000-0000-0000-0000-000000000007', 'Käse', 'Food', 'Packung', NULL),

  -- Food - Proteins
  ('10000000-0000-0000-0000-000000000008', 'Eier', 'Food', 'Stück', NULL),
  ('10000000-0000-0000-0000-000000000009', 'Hähnchenbrust', 'Food', 'kg', NULL),
  ('10000000-0000-0000-0000-000000000010', 'Hackfleisch', 'Food', 'kg', NULL),

  -- Food - Fruits & Vegetables
  ('10000000-0000-0000-0000-000000000011', 'Äpfel', 'Food', 'kg', NULL),
  ('10000000-0000-0000-0000-000000000012', 'Bananen', 'Food', 'kg', NULL),
  ('10000000-0000-0000-0000-000000000013', 'Tomaten', 'Food', 'kg', NULL),
  ('10000000-0000-0000-0000-000000000014', 'Gurke', 'Food', 'Stück', NULL),
  ('10000000-0000-0000-0000-000000000015', 'Kartoffeln', 'Food', 'kg', NULL),

  -- Drinks
  ('10000000-0000-0000-0000-000000000016', 'Orangensaft', 'Drinks', 'L', NULL),
  ('10000000-0000-0000-0000-000000000017', 'Cola', 'Drinks', 'L', NULL),
  ('10000000-0000-0000-0000-000000000018', 'Wasser (still)', 'Drinks', 'L', NULL),

  -- Household
  ('10000000-0000-0000-0000-000000000019', 'Toilettenpapier', 'Household', 'Packung', NULL),
  ('10000000-0000-0000-0000-000000000020', 'Küchenrolle', 'Household', 'Rolle', NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. SEED DEMO RECEIPTS (OPTIONAL - FOR TESTING)
-- ============================================================================
-- NOTE: These demo receipts require:
--   1. A test household to exist (you'll need to create this via app)
--   2. A test user profile to exist (created during signup)
--
-- INSTRUCTIONS:
--   - Comment out this section if you want to skip demo data
--   - Replace the UUIDs below with real household_id and user_id after signup
--   - Or create demo data manually via your app's UI
-- ============================================================================

-- EXAMPLE (COMMENTED OUT - Replace UUIDs with real values):
--
-- -- Demo Household (create this first via your app)
-- INSERT INTO households (id, name, created_by)
-- VALUES ('20000000-0000-0000-0000-000000000001', 'Demo Household', 'YOUR_USER_ID_HERE')
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Household Membership
-- INSERT INTO household_members (household_id, user_id, role)
-- VALUES ('20000000-0000-0000-0000-000000000001', 'YOUR_USER_ID_HERE', 'owner')
-- ON CONFLICT (household_id, user_id) DO NOTHING;
--
-- -- Demo Receipt 1: REWE Shopping Trip
-- INSERT INTO receipts (id, household_id, merchant_id, created_by, date, total_amount_cents, notes)
-- VALUES (
--   '30000000-0000-0000-0000-000000000001',
--   '20000000-0000-0000-0000-000000000001', -- Demo Household
--   '00000000-0000-0000-0000-000000000001', -- REWE
--   'YOUR_USER_ID_HERE',
--   NOW() - INTERVAL '2 days',
--   4567, -- €45.67
--   'Weekly groceries'
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt Items for Receipt 1
-- INSERT INTO receipt_items (receipt_id, product_id, product_name, quantity, unit, price_cents)
-- VALUES
--   ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Brot', 1, 'Stück', 249),
--   ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Milch', 2, 'L', 178),
--   ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'Eier', 10, 'Stück', 329),
--   ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000011', 'Äpfel', 1.5, 'kg', 447),
--   ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000016', 'Orangensaft', 1, 'L', 199)
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt 2: LIDL Quick Shop
-- INSERT INTO receipts (id, household_id, merchant_id, created_by, date, total_amount_cents, notes)
-- VALUES (
--   '30000000-0000-0000-0000-000000000002',
--   '20000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000002', -- LIDL
--   'YOUR_USER_ID_HERE',
--   NOW() - INTERVAL '5 days',
--   1298, -- €12.98
--   'Quick snacks'
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt Items for Receipt 2
-- INSERT INTO receipt_items (receipt_id, product_id, product_name, quantity, unit, price_cents)
-- VALUES
--   ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Brötchen', 6, 'Stück', 329),
--   ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'Joghurt', 4, 'Becher', 516),
--   ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', 'Bananen', 0.8, 'kg', 143),
--   ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000017', 'Cola', 1.5, 'L', 189)
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt 3: ALDI Weekend Shop
-- INSERT INTO receipts (id, household_id, merchant_id, created_by, date, total_amount_cents, notes)
-- VALUES (
--   '30000000-0000-0000-0000-000000000003',
--   '20000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000003', -- ALDI
--   'YOUR_USER_ID_HERE',
--   NOW() - INTERVAL '7 days',
--   3421, -- €34.21
--   'Weekend BBQ supplies'
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt Items for Receipt 3
-- INSERT INTO receipt_items (receipt_id, product_id, product_name, quantity, unit, price_cents)
-- VALUES
--   ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009', 'Hähnchenbrust', 1.2, 'kg', 1188),
--   ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000013', 'Tomaten', 0.5, 'kg', 149),
--   ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000014', 'Gurke', 2, 'Stück', 118),
--   ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000015', 'Kartoffeln', 2, 'kg', 398),
--   ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000018', 'Wasser (still)', 6, 'L', 534)
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt 4: EDEKA Household Items
-- INSERT INTO receipts (id, household_id, merchant_id, created_by, date, total_amount_cents, notes)
-- VALUES (
--   '30000000-0000-0000-0000-000000000004',
--   '20000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000004', -- EDEKA
--   'YOUR_USER_ID_HERE',
--   NOW() - INTERVAL '10 days',
--   2156, -- €21.56
--   'Household supplies'
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt Items for Receipt 4
-- INSERT INTO receipt_items (receipt_id, product_id, product_name, quantity, unit, price_cents)
-- VALUES
--   ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000019', 'Toilettenpapier', 1, 'Packung', 899),
--   ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000020', 'Küchenrolle', 2, 'Rolle', 658),
--   ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'Butter', 2, 'Packung', 358),
--   ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000007', 'Käse', 1, 'Packung', 241)
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt 5: Kaufland Big Shop
-- INSERT INTO receipts (id, household_id, merchant_id, created_by, date, total_amount_cents, notes)
-- VALUES (
--   '30000000-0000-0000-0000-000000000005',
--   '20000000-0000-0000-0000-000000000001',
--   '00000000-0000-0000-0000-000000000005', -- Kaufland
--   'YOUR_USER_ID_HERE',
--   NOW() - INTERVAL '14 days',
--   6789, -- €67.89
--   'Monthly big shop'
-- )
-- ON CONFLICT (id) DO NOTHING;
--
-- -- Demo Receipt Items for Receipt 5
-- INSERT INTO receipt_items (receipt_id, product_id, product_name, quantity, unit, price_cents)
-- VALUES
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'Toast', 2, 'Packung', 458),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'Milch', 4, 'L', 716),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000008', 'Eier', 20, 'Stück', 658),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000010', 'Hackfleisch', 1, 'kg', 799),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000011', 'Äpfel', 2, 'kg', 598),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000015', 'Kartoffeln', 5, 'kg', 995),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000016', 'Orangensaft', 2, 'L', 398),
--   ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000018', 'Wasser (still)', 12, 'L', 1068)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. VERIFICATION QUERIES (OPTIONAL - FOR TESTING)
-- ============================================================================
-- Run these queries to verify seed data was inserted correctly:
--
-- SELECT COUNT(*) FROM merchants; -- Should return 5
-- SELECT COUNT(*) FROM products; -- Should return 20
-- SELECT * FROM merchants ORDER BY name;
-- SELECT * FROM products ORDER BY category, name;
-- ============================================================================

-- ============================================================================
-- END OF MIGRATION 003
-- ============================================================================

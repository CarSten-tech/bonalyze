-- ============================================================================
-- BONALYZE DATABASE SCHEMA - MIGRATION 001: INITIAL SCHEMA
-- ============================================================================
-- Description: Core tables for Bonalyze - Household Shopping Analytics App
-- Version: 1.0.0
-- Date: 2026-01-31
-- ============================================================================

-- Enable UUID extension (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile data
-- Foreign Key to auth.users ensures profile is tied to authenticated user
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick profile lookups
CREATE INDEX idx_profiles_id ON profiles(id);

-- ============================================================================
-- 2. HOUSEHOLDS TABLE
-- ============================================================================
-- Represents a household (e.g., family, WG, shared apartment)
-- Users can belong to multiple households via household_members
-- ============================================================================

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for creator lookups (useful for "my households" queries)
CREATE INDEX idx_households_created_by ON households(created_by);

-- ============================================================================
-- 3. HOUSEHOLD_MEMBERS TABLE
-- ============================================================================
-- M:N relationship between profiles and households
-- Allows users to belong to multiple households
-- ============================================================================

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique user-household combinations
  UNIQUE(household_id, user_id)
);

-- Indexes for fast household membership lookups
CREATE INDEX idx_household_members_household_id ON household_members(household_id);
CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_composite ON household_members(household_id, user_id);

-- ============================================================================
-- 4. MERCHANTS TABLE
-- ============================================================================
-- Stores merchant/store master data (REWE, LIDL, ALDI, etc.)
-- Pre-seeded with common stores, users can add new ones
-- ============================================================================

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for merchant name searches (autocomplete)
CREATE INDEX idx_merchants_name ON merchants(name);

-- ============================================================================
-- 5. PRODUCTS TABLE
-- ============================================================================
-- Product master data (Brot, Milch, Eier, etc.)
-- Pre-seeded with common products, users can add new ones
-- ============================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT, -- e.g., 'Food', 'Drinks', 'Household'
  unit TEXT, -- e.g., 'kg', 'L', 'Stück'
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for product searches
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);

-- ============================================================================
-- 6. RECEIPTS TABLE
-- ============================================================================
-- Receipt header (Kassenbon) - stores metadata about a shopping trip
-- User-owned (created_by) but household-shared (household_id)
-- ============================================================================

CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  total_amount_cents INTEGER NOT NULL, -- Price in cents for precision
  image_url TEXT, -- Optional: Scanned receipt image
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for frequent queries
CREATE INDEX idx_receipts_household_id ON receipts(household_id);
CREATE INDEX idx_receipts_merchant_id ON receipts(merchant_id);
CREATE INDEX idx_receipts_created_by ON receipts(created_by);
CREATE INDEX idx_receipts_date ON receipts(date DESC);
-- Composite index for "household receipts sorted by date" queries
CREATE INDEX idx_receipts_household_date ON receipts(household_id, date DESC);

-- ============================================================================
-- 7. RECEIPT_ITEMS TABLE
-- ============================================================================
-- Line items for receipts (individual products on a receipt)
-- ============================================================================

CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Denormalized for history preservation
  quantity DECIMAL(10, 3) NOT NULL DEFAULT 1, -- Supports 0.5kg, etc.
  unit TEXT, -- e.g., 'kg', 'L', 'Stück'
  price_cents INTEGER NOT NULL, -- Price in cents for precision
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for receipt item lookups
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_product_id ON receipt_items(product_id);
-- Composite index for product analytics (e.g., "all purchases of product X")
CREATE INDEX idx_receipt_items_composite ON receipt_items(receipt_id, product_id);

-- ============================================================================
-- 8. SHOPPING_LISTS TABLE
-- ============================================================================
-- Shopping list header (Einkaufsliste)
-- Household-shared, collaborative editing by all members
-- ============================================================================

CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for shopping list queries
CREATE INDEX idx_shopping_lists_household_id ON shopping_lists(household_id);
CREATE INDEX idx_shopping_lists_created_by ON shopping_lists(created_by);

-- ============================================================================
-- 9. SHOPPING_LIST_ITEMS TABLE
-- ============================================================================
-- Items on shopping lists
-- ============================================================================

CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Denormalized for flexibility
  quantity DECIMAL(10, 3) DEFAULT 1,
  unit TEXT,
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for shopping list item lookups
CREATE INDEX idx_shopping_list_items_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_product_id ON shopping_list_items(product_id);

-- ============================================================================
-- AUTO-UPDATE UPDATED_AT TRIGGER
-- ============================================================================
-- Automatically updates updated_at timestamp when a row is modified
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_household_members_updated_at BEFORE UPDATE ON household_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipt_items_updated_at BEFORE UPDATE ON receipt_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- END OF MIGRATION 001
-- ============================================================================

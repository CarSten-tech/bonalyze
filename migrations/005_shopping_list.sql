-- Migration: 005_shopping_list.sql
-- Feature: PROJ-16 Shopping List
-- Created: 2026-02-04

-- ============================================
-- 1. SHOPPING LISTS (Multi-list support)
-- ============================================

CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Einkaufsliste',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for household lookup
CREATE INDEX idx_shopping_lists_household ON shopping_lists(household_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_shopping_list_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_list_timestamp();

-- ============================================
-- 2. SHOPPING LIST ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT, -- "1L", "500g", "2 Stück"
  note TEXT,
  is_checked BOOLEAN DEFAULT false,
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES auth.users(id),
  added_by UUID REFERENCES auth.users(id),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for realtime subscriptions and list queries
CREATE INDEX idx_shopping_items_list ON shopping_list_items(list_id);
CREATE INDEX idx_shopping_items_checked ON shopping_list_items(list_id, is_checked);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Shopping Lists: Only household members can access
CREATE POLICY shopping_lists_select ON shopping_lists
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY shopping_lists_insert ON shopping_lists
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY shopping_lists_update ON shopping_lists
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY shopping_lists_delete ON shopping_lists
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid()
    )
  );

-- Shopping List Items: Access through list -> household membership
CREATE POLICY shopping_items_select ON shopping_list_items
  FOR SELECT USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY shopping_items_insert ON shopping_list_items
  FOR INSERT WITH CHECK (
    list_id IN (
      SELECT id FROM shopping_lists WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY shopping_items_update ON shopping_list_items
  FOR UPDATE USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY shopping_items_delete ON shopping_list_items
  FOR DELETE USING (
    list_id IN (
      SELECT id FROM shopping_lists WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 4. REALTIME PUBLICATION
-- ============================================

-- Enable realtime for shopping items (for live sync)
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_list_items;

-- ============================================
-- 5. DEFAULT LIST FUNCTION
-- ============================================

-- Function to ensure each household has a default list
CREATE OR REPLACE FUNCTION ensure_default_shopping_list()
RETURNS TRIGGER AS $$
BEGIN
  -- When a household is created, create a default shopping list
  INSERT INTO shopping_lists (household_id, name, is_default, created_by)
  VALUES (NEW.id, 'Einkaufsliste', true, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger should be added to households table if it doesn't exist
-- CREATE TRIGGER create_default_shopping_list
--   AFTER INSERT ON households
--   FOR EACH ROW
--   EXECUTE FUNCTION ensure_default_shopping_list();

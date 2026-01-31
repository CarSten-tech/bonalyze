-- ============================================================================
-- BONALYZE DATABASE SCHEMA - MIGRATION 002: ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Description: Security policies to ensure users only see their household data
-- Version: 1.0.0
-- Date: 2026-01-31
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: is_household_member
-- ============================================================================
-- Checks if a user is a member of a specific household
-- Used by multiple RLS policies for code reuse
-- ============================================================================

CREATE OR REPLACE FUNCTION is_household_member(household_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM household_members
    WHERE household_members.household_id = is_household_member.household_id
      AND household_members.user_id = is_household_member.user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. PROFILES TABLE - RLS POLICIES
-- ============================================================================
-- Users can only see and update their own profile
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own profile
CREATE POLICY profiles_delete_own ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================================================
-- 2. HOUSEHOLDS TABLE - RLS POLICIES
-- ============================================================================
-- Users can only see households where they are members
-- ============================================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- Policy: Users see households they are members of
CREATE POLICY households_select_members ON households
  FOR SELECT
  USING (is_household_member(id, auth.uid()));

-- Policy: Users can create new households
CREATE POLICY households_insert_own ON households
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update households they are members of
CREATE POLICY households_update_members ON households
  FOR UPDATE
  USING (is_household_member(id, auth.uid()))
  WITH CHECK (is_household_member(id, auth.uid()));

-- Policy: Only household creators can delete households
CREATE POLICY households_delete_creator ON households
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- 3. HOUSEHOLD_MEMBERS TABLE - RLS POLICIES
-- ============================================================================
-- Users can see members of their households
-- ============================================================================

ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users see members of their households
CREATE POLICY household_members_select_own_households ON household_members
  FOR SELECT
  USING (is_household_member(household_id, auth.uid()));

-- Policy: Users can join households (insert themselves)
CREATE POLICY household_members_insert_self ON household_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own membership
CREATE POLICY household_members_update_self ON household_members
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can leave households (delete their own membership)
CREATE POLICY household_members_delete_self ON household_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. MERCHANTS TABLE - RLS POLICIES
-- ============================================================================
-- Users can view all merchants (public master data)
-- Users can create new merchants
-- ============================================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view all merchants (public master data)
CREATE POLICY merchants_select_all ON merchants
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create new merchants
CREATE POLICY merchants_insert_authenticated ON merchants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update merchants they created
CREATE POLICY merchants_update_own ON merchants
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete merchants they created
CREATE POLICY merchants_delete_own ON merchants
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- 5. PRODUCTS TABLE - RLS POLICIES
-- ============================================================================
-- Users can view all products (public master data)
-- Users can create new products
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view all products (public master data)
CREATE POLICY products_select_all ON products
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can create new products
CREATE POLICY products_insert_authenticated ON products
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update products they created
CREATE POLICY products_update_own ON products
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can delete products they created
CREATE POLICY products_delete_own ON products
  FOR DELETE
  USING (auth.uid() = created_by);

-- ============================================================================
-- 6. RECEIPTS TABLE - RLS POLICIES
-- ============================================================================
-- Users can only see receipts from their households
-- All household members can edit receipts (full access)
-- ============================================================================

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users see receipts from their households
CREATE POLICY receipts_select_household_members ON receipts
  FOR SELECT
  USING (is_household_member(household_id, auth.uid()));

-- Policy: Users can create receipts in their households
CREATE POLICY receipts_insert_household_members ON receipts
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND is_household_member(household_id, auth.uid())
  );

-- Policy: All household members can update receipts (full access)
CREATE POLICY receipts_update_household_members ON receipts
  FOR UPDATE
  USING (is_household_member(household_id, auth.uid()))
  WITH CHECK (is_household_member(household_id, auth.uid()));

-- Policy: All household members can delete receipts (full access)
CREATE POLICY receipts_delete_household_members ON receipts
  FOR DELETE
  USING (is_household_member(household_id, auth.uid()));

-- ============================================================================
-- 7. RECEIPT_ITEMS TABLE - RLS POLICIES
-- ============================================================================
-- Users can only see receipt items from their household receipts
-- ============================================================================

ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users see receipt items from their household receipts
CREATE POLICY receipt_items_select_household_members ON receipt_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_items.receipt_id
        AND is_household_member(receipts.household_id, auth.uid())
    )
  );

-- Policy: Users can create receipt items for their household receipts
CREATE POLICY receipt_items_insert_household_members ON receipt_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_items.receipt_id
        AND is_household_member(receipts.household_id, auth.uid())
    )
  );

-- Policy: Users can update receipt items from their household receipts
CREATE POLICY receipt_items_update_household_members ON receipt_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_items.receipt_id
        AND is_household_member(receipts.household_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_items.receipt_id
        AND is_household_member(receipts.household_id, auth.uid())
    )
  );

-- Policy: Users can delete receipt items from their household receipts
CREATE POLICY receipt_items_delete_household_members ON receipt_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_items.receipt_id
        AND is_household_member(receipts.household_id, auth.uid())
    )
  );

-- ============================================================================
-- 8. SHOPPING_LISTS TABLE - RLS POLICIES
-- ============================================================================
-- Users can only see shopping lists from their households
-- All household members can edit lists (full access)
-- ============================================================================

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Users see shopping lists from their households
CREATE POLICY shopping_lists_select_household_members ON shopping_lists
  FOR SELECT
  USING (is_household_member(household_id, auth.uid()));

-- Policy: Users can create shopping lists in their households
CREATE POLICY shopping_lists_insert_household_members ON shopping_lists
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND is_household_member(household_id, auth.uid())
  );

-- Policy: All household members can update shopping lists (full access)
CREATE POLICY shopping_lists_update_household_members ON shopping_lists
  FOR UPDATE
  USING (is_household_member(household_id, auth.uid()))
  WITH CHECK (is_household_member(household_id, auth.uid()));

-- Policy: All household members can delete shopping lists (full access)
CREATE POLICY shopping_lists_delete_household_members ON shopping_lists
  FOR DELETE
  USING (is_household_member(household_id, auth.uid()));

-- ============================================================================
-- 9. SHOPPING_LIST_ITEMS TABLE - RLS POLICIES
-- ============================================================================
-- Users can only see shopping list items from their household lists
-- ============================================================================

ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users see shopping list items from their household lists
CREATE POLICY shopping_list_items_select_household_members ON shopping_list_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND is_household_member(shopping_lists.household_id, auth.uid())
    )
  );

-- Policy: Users can create shopping list items in their household lists
CREATE POLICY shopping_list_items_insert_household_members ON shopping_list_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND is_household_member(shopping_lists.household_id, auth.uid())
    )
  );

-- Policy: Users can update shopping list items from their household lists
CREATE POLICY shopping_list_items_update_household_members ON shopping_list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND is_household_member(shopping_lists.household_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND is_household_member(shopping_lists.household_id, auth.uid())
    )
  );

-- Policy: Users can delete shopping list items from their household lists
CREATE POLICY shopping_list_items_delete_household_members ON shopping_list_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id
        AND is_household_member(shopping_lists.household_id, auth.uid())
    )
  );

-- ============================================================================
-- END OF MIGRATION 002
-- ============================================================================

-- Migration to fix RLS policies for shopping_lists
-- Date: 2026-02-04
-- Author: Agent

-- Drop old function-based policy that caused recursion issues
DROP POLICY IF EXISTS "shopping_lists_select_household_members" ON "shopping_lists";
DROP POLICY IF EXISTS "shopping_lists_debug_allow_all" ON "shopping_lists"; -- Remove debug policy if exists

-- Create robust subquery-based policy (using household_members RLS)
CREATE POLICY "shopping_lists_select_household_members_v2" ON "shopping_lists"
FOR SELECT TO authenticated
USING (
  household_id IN (
    SELECT household_id FROM household_members WHERE user_id = auth.uid()
  )
);

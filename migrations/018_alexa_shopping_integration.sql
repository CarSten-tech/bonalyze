-- Migration: 018_alexa_shopping_integration.sql
-- Feature: Enterprise Alexa Integration for Shopping Lists
-- Created: 2026-02-14

-- ============================================
-- 1. ALEXA USER LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS alexa_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alexa_user_id TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  locale TEXT DEFAULT 'de-DE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alexa_user_links_user_id ON alexa_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_alexa_user_links_household_id ON alexa_user_links(household_id);
CREATE INDEX IF NOT EXISTS idx_alexa_user_links_list_id ON alexa_user_links(shopping_list_id);

-- ============================================
-- 2. ONE-TIME LINK CODES
-- ============================================

CREATE TABLE IF NOT EXISTS alexa_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alexa_link_codes_user_id ON alexa_link_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_alexa_link_codes_expires_at ON alexa_link_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_alexa_link_codes_code_hash ON alexa_link_codes(code_hash);

-- ============================================
-- 3. TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_alexa_user_links_updated_at ON alexa_user_links;
CREATE TRIGGER update_alexa_user_links_updated_at
  BEFORE UPDATE ON alexa_user_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE alexa_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE alexa_link_codes ENABLE ROW LEVEL SECURITY;

-- alexa_user_links: users can only view their own links
DROP POLICY IF EXISTS alexa_user_links_select_own ON alexa_user_links;
CREATE POLICY alexa_user_links_select_own ON alexa_user_links
  FOR SELECT USING (auth.uid() = user_id);

-- alexa_link_codes: users can create/view/delete only their own codes
DROP POLICY IF EXISTS alexa_link_codes_select_own ON alexa_link_codes;
CREATE POLICY alexa_link_codes_select_own ON alexa_link_codes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS alexa_link_codes_insert_own ON alexa_link_codes;
CREATE POLICY alexa_link_codes_insert_own ON alexa_link_codes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS alexa_link_codes_delete_own ON alexa_link_codes;
CREATE POLICY alexa_link_codes_delete_own ON alexa_link_codes
  FOR DELETE USING (auth.uid() = user_id);

-- Migration: Create search_food RPC function
-- Description: Performant server-side search for nutrition library
-- Author: Bonalyze AI

CREATE OR REPLACE FUNCTION search_food(
  search_term TEXT,
  items_per_page INT DEFAULT 20,
  page_number INT DEFAULT 0
)
RETURNS SETOF nutrition_library AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM nutrition_library
  WHERE
    name ILIKE '%' || search_term || '%'
  ORDER BY
    -- Smart Sorting Logic:
    -- 1. Exact match items first
    CASE WHEN LOWER(name) = LOWER(search_term) THEN 0 ELSE 1 END ASC,
    -- 2. Starts with search term
    CASE WHEN LOWER(name) LIKE LOWER(search_term) || '%' THEN 0 ELSE 1 END ASC,
    -- 3. Shorter names (ingredients) first
    LENGTH(name) ASC,
    -- 4. Alphabetical fallback
    name ASC
  LIMIT items_per_page
  OFFSET page_number * items_per_page;
END;
$$ LANGUAGE plpgsql;

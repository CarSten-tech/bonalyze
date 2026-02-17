-- Add GIN indexes for faster trigram search on offers
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_offers_product_name_trgm ON offers USING gin (product_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_offers_category_trgm ON offers USING gin (category gin_trgm_ops);

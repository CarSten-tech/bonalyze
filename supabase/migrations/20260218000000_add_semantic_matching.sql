-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add embedding column to offers table
ALTER TABLE offers 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create an index on the offers embedding column for faster similarity search
CREATE INDEX IF NOT EXISTS offer_embedding_idx ON offers USING hnsw (embedding vector_cosine_ops);

-- Create the RPC function to find semantic matches
CREATE OR REPLACE FUNCTION get_semantic_matches(
  p_household_id uuid,
  p_threshold float DEFAULT 0.7,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  product_name text,
  price numeric,
  original_price numeric,
  store text,
  image_url text,
  valid_from timestamptz,
  valid_until timestamptz,
  discount_percent numeric,
  category text,
  source_url text,
  price_per_unit text,
  weight_volume text,
  scraped_at timestamptz,
  similarity float
) AS $$
DECLARE
  v_product_embeddings vector(768)[];
BEGIN
  -- 1. Get embeddings for the household's top purchased products
  SELECT ARRAY_AGG(p.embedding)
  INTO v_product_embeddings
  FROM (
    SELECT ri.product_name, COUNT(*) as purchase_count
    FROM receipt_items ri
    JOIN receipts r ON ri.receipt_id = r.id
    WHERE r.household_id = p_household_id
    GROUP BY ri.product_name
    ORDER BY purchase_count DESC
    LIMIT 20
  ) top_products
  JOIN products p ON p.name = top_products.product_name
  WHERE p.embedding IS NOT NULL;

  -- If no products with embeddings found, return empty result
  IF v_product_embeddings IS NULL OR array_length(v_product_embeddings, 1) IS NULL THEN
    RETURN;
  END IF;

  -- 2. Find offers similar to any of the product embeddings
  RETURN QUERY
  SELECT
    o.id,
    o.product_name,
    o.price,
    o.original_price,
    o.store,
    o.image_url,
    o.valid_from,
    o.valid_until,
    o.discount_percent,
    o.category,
    o.source_url,
    o.price_per_unit,
    o.weight_volume,
    o.scraped_at,
    -- Calculate max similarity across all product embeddings
    (
      SELECT MAX(1 - (o.embedding <=> pe))
      FROM unnest(v_product_embeddings) pe
    ) as similarity
  FROM offers o
  WHERE 
    o.valid_until >= NOW() 
    AND o.embedding IS NOT NULL
    AND (
      SELECT MAX(1 - (o.embedding <=> pe))
      FROM unnest(v_product_embeddings) pe
    ) > p_threshold
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

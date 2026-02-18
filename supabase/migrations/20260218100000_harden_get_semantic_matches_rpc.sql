-- Harden semantic offer matching RPC:
-- 1) enforce deterministic search_path
-- 2) verify caller household membership (unless service_role)
-- 3) restrict execute privileges explicitly

CREATE OR REPLACE FUNCTION public.get_semantic_matches(
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
  currency text,
  offer_id text,
  scraped_at timestamptz,
  similarity float
) AS $$
DECLARE
  v_product_embeddings vector(768)[];
  v_has_access boolean := false;
BEGIN
  -- Enforce household access for authenticated callers.
  -- service_role keeps privileged access for backend maintenance flows.
  IF auth.role() <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = p_household_id
        AND hm.user_id = auth.uid()
    )
    INTO v_has_access;

    IF NOT v_has_access THEN
      RAISE EXCEPTION 'Insufficient privileges for requested household'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 1. Get embeddings for the household's top purchased products
  SELECT ARRAY_AGG(p.embedding)
  INTO v_product_embeddings
  FROM (
    SELECT ri.product_name, COUNT(*) as purchase_count
    FROM public.receipt_items ri
    JOIN public.receipts r ON ri.receipt_id = r.id
    WHERE r.household_id = p_household_id
    GROUP BY ri.product_name
    ORDER BY purchase_count DESC
    LIMIT 20
  ) top_products
  JOIN public.products p ON p.name = top_products.product_name
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
    o.currency,
    o.offer_id,
    o.scraped_at,
    (
      SELECT MAX(1 - (o.embedding <=> pe))
      FROM unnest(v_product_embeddings) pe
    ) as similarity
  FROM public.offers o
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_semantic_matches(uuid, float, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_semantic_matches(uuid, float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_semantic_matches(uuid, float, int) TO service_role;

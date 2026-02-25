-- Creates a trigger to clean up offers data before insert/update
-- Specifically catches wine/liquor incorrectly categorized as fruits by external scrapers.

CREATE OR REPLACE FUNCTION clean_offer_category()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run hygiene checks if product_name and category are present
    IF NEW.product_name IS NOT NULL AND NEW.category IS NOT NULL THEN
        
        -- Rule 1: Alcohol miscategorized as food/fruits
        IF (NEW.category ILIKE '%Obst%' OR NEW.category ILIKE '%Gemüse%' OR NEW.category ILIKE '%Lebensmittel%' OR NEW.category ILIKE '%Sonstiges%') AND 
           (NEW.product_name ILIKE '%wein%' OR 
            NEW.product_name ILIKE '%likör%' OR 
            NEW.product_name ILIKE '%likor%' OR 
            NEW.product_name ILIKE '%bier%' OR 
            NEW.product_name ILIKE '%sekt%' OR 
            NEW.product_name ILIKE '%primitivo%' OR
            NEW.product_name ILIKE '%riesling%' OR
            NEW.product_name ILIKE '%chardonnay%' OR
            NEW.product_name ILIKE '%vodka%' OR
            NEW.product_name ILIKE '%gin %' OR
            NEW.product_name ILIKE '% rum%') AND
            -- Prevent false positives for food that sounds like alcohol
            NEW.product_name NOT ILIKE '%weingummi%' AND
            NEW.product_name NOT ILIKE '%weinbeere%' AND
            NEW.product_name NOT ILIKE '%weinbrandbohne%' AND
            NEW.product_name NOT ILIKE '%bierwurst%' AND
            NEW.product_name NOT ILIKE '%bierschinken%'
        THEN
            NEW.category := 'Getränke > Alkoholisch';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to offers table
DROP TRIGGER IF EXISTS trg_clean_offer_category ON offers;

CREATE TRIGGER trg_clean_offer_category
    BEFORE INSERT OR UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION clean_offer_category();

-- Clean up existing bad data as a one-time operation
UPDATE offers 
SET category = 'Getränke > Alkoholisch'
WHERE (category ILIKE '%Obst%' OR category ILIKE '%Gemüse%' OR category ILIKE '%Lebensmittel%' OR category ILIKE '%Sonstiges%') 
  AND (product_name ILIKE '%wein%' OR 
       product_name ILIKE '%likör%' OR 
       product_name ILIKE '%likor%' OR 
       product_name ILIKE '%bier%' OR 
       product_name ILIKE '%sekt%' OR 
       product_name ILIKE '%primitivo%' OR
       product_name ILIKE '%riesling%' OR
       product_name ILIKE '%chardonnay%' OR
       product_name ILIKE '%vodka%' OR
       product_name ILIKE '%gin %' OR
       product_name ILIKE '% rum%')
  AND product_name NOT ILIKE '%weingummi%' 
  AND product_name NOT ILIKE '%weinbeere%' 
  AND product_name NOT ILIKE '%weinbrandbohne%' 
  AND product_name NOT ILIKE '%bierwurst%' 
  AND product_name NOT ILIKE '%bierschinken%';

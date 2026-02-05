-- Migration 013: Add Warranty Fields to Receipt Items

ALTER TABLE receipt_items 
ADD COLUMN is_warranty_item boolean DEFAULT false,
ADD COLUMN warranty_end_date date,
ADD COLUMN warranty_period_months integer DEFAULT 24;

-- Add comment
COMMENT ON COLUMN receipt_items.is_warranty_item IS 'If true, this item is tracked in the Warranty Vault';

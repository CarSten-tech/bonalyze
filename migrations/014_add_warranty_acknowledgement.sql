-- Migration 014: Add Warranty Acknowledgement

ALTER TABLE receipt_items 
ADD COLUMN expiry_acknowledged boolean DEFAULT false;

COMMENT ON COLUMN receipt_items.expiry_acknowledged IS 'If true, the user has dismissed the expiration alert from the dashboard';

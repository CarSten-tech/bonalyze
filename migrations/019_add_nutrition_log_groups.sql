-- Add group_id and group_name columns to nutrition_logs table for grouping meal ingredients
ALTER TABLE nutrition_logs
ADD COLUMN group_id UUID,
ADD COLUMN group_name TEXT;

-- Add index on group_id for faster lookups
CREATE INDEX idx_nutrition_logs_group_id ON nutrition_logs(group_id);

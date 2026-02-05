-- Remove old constraint
ALTER TABLE budget_alerts DROP CONSTRAINT IF EXISTS budget_alerts_alert_type_check;

-- Add new constraint with expanded types
-- warning_50_remaining = 50% Used
-- warning_25_remaining = 75% Used
-- warning_10_remaining = 90% Used
ALTER TABLE budget_alerts ADD CONSTRAINT budget_alerts_alert_type_check 
  CHECK (alert_type IN (
    'warning_80', 
    'exceeded_100', -- Keeping old ones for backward compatibility logic if needed
    'warning_50_remaining', 
    'warning_25_remaining', 
    'warning_10_remaining'
  ));

-- Create budgets table
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'weekly')),
  total_amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id)
);

-- Create category_budgets table
CREATE TABLE category_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(budget_id, category)
);

-- Create budget_alerts table for tracking sent notifications
CREATE TABLE budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning_80', 'exceeded_100')),
  period_start DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, alert_type, period_start)
);

-- Add updated_at trigger for budgets
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for category_budgets
CREATE TRIGGER update_category_budgets_updated_at
  BEFORE UPDATE ON category_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Enable RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;

-- Budgets policies
CREATE POLICY "Users can view budgets of their household"
  ON budgets FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Household admins and owners can manage budgets"
  ON budgets FOR ALL
  USING (
    household_id IN (
      SELECT household_id FROM household_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Category Budgets policies
CREATE POLICY "Users can view category budgets of their household"
  ON category_budgets FOR SELECT
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE household_id IN (
        SELECT household_id FROM household_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Household admins and owners can manage category budgets"
  ON category_budgets FOR ALL
  USING (
    budget_id IN (
      SELECT id FROM budgets WHERE household_id IN (
        SELECT household_id FROM household_members 
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- Budget Alerts policies
CREATE POLICY "Users can view budget alerts of their household"
  ON budget_alerts FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

-- System/Functions can insert alerts (or any member if logic runs client-side/server-action)
-- Assuming server actions will run with user context, we allow members to insert/update if needed by logic
-- Or restricting to service role if strictly backend. simpler to allow members for now as the check runs in their context.
CREATE POLICY "Users can insert budget alerts for their household"
  ON budget_alerts FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members WHERE user_id = auth.uid()
    )
  );

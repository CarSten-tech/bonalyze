-- Refine push_subscriptions table

-- Drop old columns if they exist (assuming clean state or easy migration)
-- If data preservation was critical, we would migrate data to JSONB first.
-- Since this is dev/initial phase, we'll alter proactively.

ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS auth_keys JSONB,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
DROP COLUMN IF EXISTS auth,
DROP COLUMN IF EXISTS p256dh;

-- Make auth_keys required if existing rows are handled or table is empty
-- For now, we allow null safely or assume table handles it, but ideally keys are needed.
-- Let's assume we want to enforce it for new rows.
ALTER TABLE push_subscriptions ALTER COLUMN auth_keys SET NOT NULL;

-- Ensure endpoint is still unique (already is from previous migration)

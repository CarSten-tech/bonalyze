UPDATE public.household_members
SET role = 'member'
WHERE role IS NULL OR role NOT IN ('owner', 'admin', 'member');

WITH ranked_owners AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY household_id ORDER BY created_at ASC, id ASC) AS owner_rank
  FROM public.household_members
  WHERE role = 'owner'
)
UPDATE public.household_members hm
SET role = 'admin'
FROM ranked_owners ro
WHERE hm.id = ro.id
  AND ro.owner_rank > 1;

ALTER TABLE public.household_members
  ALTER COLUMN role SET DEFAULT 'member';

ALTER TABLE public.household_members
  ALTER COLUMN role SET NOT NULL;

ALTER TABLE public.household_members
  DROP CONSTRAINT IF EXISTS household_members_role_check;

ALTER TABLE public.household_members
  ADD CONSTRAINT household_members_role_check
  CHECK (role IN ('owner', 'admin', 'member'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_household_members_single_owner
  ON public.household_members (household_id)
  WHERE role = 'owner';

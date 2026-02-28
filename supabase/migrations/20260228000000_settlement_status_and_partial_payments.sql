CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_amount_cents integer NOT NULL DEFAULT 0,
  remaining_amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  settled_at timestamptz NULL,
  settled_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS public.settlement_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  paid_amount_cents integer NOT NULL DEFAULT 0,
  paid_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS remaining_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.settlement_transfers
  ADD COLUMN IF NOT EXISTS paid_amount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz NULL;

UPDATE public.settlements
SET status = CASE
  WHEN settled_at IS NOT NULL THEN 'settled'
  WHEN COALESCE(remaining_amount_cents, total_amount_cents, 0) = 0 THEN 'settled'
  ELSE 'open'
END
WHERE status IS NULL OR status NOT IN ('open', 'partial', 'settled');

UPDATE public.settlements
SET remaining_amount_cents = CASE
  WHEN status = 'settled' THEN 0
  ELSE GREATEST(total_amount_cents, 0)
END
WHERE remaining_amount_cents IS NULL;

ALTER TABLE public.settlements
  ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.settlements
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.settlements
  DROP CONSTRAINT IF EXISTS settlements_status_check;

ALTER TABLE public.settlements
  ADD CONSTRAINT settlements_status_check
  CHECK (status IN ('open', 'partial', 'settled'));

UPDATE public.settlement_transfers st
SET paid_amount_cents = CASE
  WHEN s.settled_at IS NOT NULL THEN st.amount_cents
  ELSE COALESCE(st.paid_amount_cents, 0)
END
FROM public.settlements s
WHERE s.id = st.settlement_id;

UPDATE public.settlement_transfers
SET paid_at = now()
WHERE paid_amount_cents >= amount_cents
  AND paid_at IS NULL;

ALTER TABLE public.settlement_transfers
  DROP CONSTRAINT IF EXISTS settlement_transfers_amount_check;

ALTER TABLE public.settlement_transfers
  ADD CONSTRAINT settlement_transfers_amount_check
  CHECK (amount_cents > 0);

ALTER TABLE public.settlement_transfers
  DROP CONSTRAINT IF EXISTS settlement_transfers_paid_amount_check;

ALTER TABLE public.settlement_transfers
  ADD CONSTRAINT settlement_transfers_paid_amount_check
  CHECK (paid_amount_cents >= 0 AND paid_amount_cents <= amount_cents);

CREATE INDEX IF NOT EXISTS idx_settlements_household_status_period
  ON public.settlements (household_id, status, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_settlement_transfers_settlement_paid
  ON public.settlement_transfers (settlement_id, paid_amount_cents);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_select_members" ON public.settlements;
CREATE POLICY "settlements_select_members"
ON public.settlements FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = settlements.household_id
      AND hm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "settlements_modify_members" ON public.settlements;
CREATE POLICY "settlements_modify_members"
ON public.settlements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = settlements.household_id
      AND hm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.household_members hm
    WHERE hm.household_id = settlements.household_id
      AND hm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "settlement_transfers_select_members" ON public.settlement_transfers;
CREATE POLICY "settlement_transfers_select_members"
ON public.settlement_transfers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.settlements s
    JOIN public.household_members hm ON hm.household_id = s.household_id
    WHERE s.id = settlement_transfers.settlement_id
      AND hm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "settlement_transfers_modify_members" ON public.settlement_transfers;
CREATE POLICY "settlement_transfers_modify_members"
ON public.settlement_transfers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.settlements s
    JOIN public.household_members hm ON hm.household_id = s.household_id
    WHERE s.id = settlement_transfers.settlement_id
      AND hm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.settlements s
    JOIN public.household_members hm ON hm.household_id = s.household_id
    WHERE s.id = settlement_transfers.settlement_id
      AND hm.user_id = auth.uid()
  )
);

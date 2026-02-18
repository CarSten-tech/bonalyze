CREATE TABLE IF NOT EXISTS public.ai_quality_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type text NOT NULL CHECK (metric_type IN ('receipt_scan', 'food_scan', 'offer_match')),
  household_id uuid NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  confidence double precision NULL,
  match_score double precision NULL,
  model text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_quality_metrics_household_created
  ON public.ai_quality_metrics (household_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_quality_metrics_type_created
  ON public.ai_quality_metrics (metric_type, created_at DESC);

ALTER TABLE public.ai_quality_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_quality_metrics_select_members" ON public.ai_quality_metrics;
CREATE POLICY "ai_quality_metrics_select_members"
ON public.ai_quality_metrics FOR SELECT
TO authenticated
USING (
  (
    household_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.household_members hm
      WHERE hm.household_id = ai_quality_metrics.household_id
        AND hm.user_id = auth.uid()
    )
  )
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "ai_quality_metrics_insert_service_role" ON public.ai_quality_metrics;
CREATE POLICY "ai_quality_metrics_insert_service_role"
ON public.ai_quality_metrics FOR INSERT
TO service_role
WITH CHECK (true);

GRANT SELECT ON public.ai_quality_metrics TO authenticated;
GRANT INSERT ON public.ai_quality_metrics TO service_role;

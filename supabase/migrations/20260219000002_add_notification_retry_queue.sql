CREATE TABLE IF NOT EXISTS public.notification_retry_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  notification_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'sent', 'dead_letter')),
  attempt_count int NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  max_attempts int NOT NULL DEFAULT 5 CHECK (max_attempts >= 1),
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  last_error text NULL,
  dead_letter_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_retry_queue_household_status
  ON public.notification_retry_queue (household_id, status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_notification_retry_queue_created
  ON public.notification_retry_queue (created_at DESC);

ALTER TABLE public.notification_retry_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_retry_queue_select_members" ON public.notification_retry_queue;
CREATE POLICY "notification_retry_queue_select_members"
ON public.notification_retry_queue FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.household_id = notification_retry_queue.household_id
      AND hm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "notification_retry_queue_manage_service_role" ON public.notification_retry_queue;
CREATE POLICY "notification_retry_queue_manage_service_role"
ON public.notification_retry_queue FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT ON public.notification_retry_queue TO authenticated;
GRANT ALL ON public.notification_retry_queue TO service_role;

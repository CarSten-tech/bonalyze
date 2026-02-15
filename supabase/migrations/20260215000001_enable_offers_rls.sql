-- Enable RLS on offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "offers_select_all" ON public.offers FOR SELECT USING (true);

-- Allow service role to manage offers
CREATE POLICY "offers_all_service" ON public.offers USING (auth.role() = 'service_role');

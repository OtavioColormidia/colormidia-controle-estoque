
ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_by uuid;

-- Allow public (anon) read for the landing page
GRANT SELECT ON public.form_responses TO anon;

DROP POLICY IF EXISTS "Public can view form responses" ON public.form_responses;
CREATE POLICY "Public can view form responses"
ON public.form_responses
FOR SELECT
TO anon
USING (true);

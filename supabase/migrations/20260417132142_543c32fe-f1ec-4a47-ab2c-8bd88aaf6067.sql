-- Add columns to track order status on form responses
ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS ordered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ordered_by uuid,
  ADD COLUMN IF NOT EXISTS ordered_at timestamptz;

-- Allow authorized roles (admin/compras/almoxarife) to update form responses
CREATE POLICY "Authorized roles can update form responses"
ON public.form_responses
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
);
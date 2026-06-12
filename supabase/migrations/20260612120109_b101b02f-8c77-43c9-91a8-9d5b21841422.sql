DROP POLICY IF EXISTS "Admins can delete form responses" ON public.form_responses;
CREATE POLICY "Authorized roles can delete form responses"
ON public.form_responses
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
);

CREATE TABLE public.epi_compliance_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  employee_id uuid,
  employee_name text NOT NULL,
  employee_role text,
  epi_name text NOT NULL,
  is_using boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.epi_compliance_checks TO authenticated;
GRANT ALL ON public.epi_compliance_checks TO service_role;

ALTER TABLE public.epi_compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view epi compliance checks"
ON public.epi_compliance_checks FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_authorized = true));

CREATE POLICY "Service roles can create epi compliance checks"
ON public.epi_compliance_checks FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almoxarife'::app_role) OR has_role(auth.uid(), 'compras'::app_role));

CREATE POLICY "Service roles can update epi compliance checks"
ON public.epi_compliance_checks FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almoxarife'::app_role) OR has_role(auth.uid(), 'compras'::app_role));

CREATE POLICY "Service roles can delete epi compliance checks"
ON public.epi_compliance_checks FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almoxarife'::app_role) OR has_role(auth.uid(), 'compras'::app_role));

CREATE TRIGGER update_epi_compliance_checks_updated_at
BEFORE UPDATE ON public.epi_compliance_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.epi_compliance_checks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.epi_compliance_checks;

CREATE INDEX idx_epi_compliance_date ON public.epi_compliance_checks(check_date DESC);
CREATE INDEX idx_epi_compliance_employee ON public.epi_compliance_checks(employee_id);

-- Tabela de Ordens de Serviço (Controle de Serviço com checklist de Ferramentas + EPIs)
CREATE TABLE public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  employee_name TEXT NOT NULL,
  client_name TEXT,
  service_type TEXT NOT NULL,
  auxiliar_name TEXT,
  tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  epis JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;

CREATE POLICY "Authorized users can view service orders"
ON public.service_orders FOR SELECT
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_authorized = true));

CREATE POLICY "Admin and Almoxarife can create service orders"
ON public.service_orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almoxarife'::app_role));

CREATE POLICY "Admin and Almoxarife can update service orders"
ON public.service_orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almoxarife'::app_role));

CREATE POLICY "Admin and Almoxarife can delete service orders"
ON public.service_orders FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'almoxarife'::app_role));

CREATE TRIGGER update_service_orders_updated_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_orders_date ON public.service_orders(date DESC);
CREATE INDEX idx_service_orders_employee ON public.service_orders(employee_name);
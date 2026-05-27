-- service_orders
DROP POLICY IF EXISTS "Admin and Almoxarife can create service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Admin and Almoxarife can update service orders" ON public.service_orders;
DROP POLICY IF EXISTS "Admin and Almoxarife can delete service orders" ON public.service_orders;

CREATE POLICY "Service roles can create service orders" ON public.service_orders
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can update service orders" ON public.service_orders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can delete service orders" ON public.service_orders
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));

-- employees
DROP POLICY IF EXISTS "Admin and Almoxarife can create employees" ON public.employees;
DROP POLICY IF EXISTS "Admin and Almoxarife can update employees" ON public.employees;
DROP POLICY IF EXISTS "Admin and Almoxarife can delete employees" ON public.employees;

CREATE POLICY "Service roles can create employees" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can update employees" ON public.employees
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can delete employees" ON public.employees
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));

-- epis
DROP POLICY IF EXISTS "Admin and Almoxarife can create epis" ON public.epis;
DROP POLICY IF EXISTS "Admin and Almoxarife can update epis" ON public.epis;
DROP POLICY IF EXISTS "Admin and Almoxarife can delete epis" ON public.epis;

CREATE POLICY "Service roles can create epis" ON public.epis
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can update epis" ON public.epis
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can delete epis" ON public.epis
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));

-- epi_deliveries
DROP POLICY IF EXISTS "Admin and Almoxarife can create epi deliveries" ON public.epi_deliveries;
DROP POLICY IF EXISTS "Admin and Almoxarife can update epi deliveries" ON public.epi_deliveries;
DROP POLICY IF EXISTS "Admin and Almoxarife can delete epi deliveries" ON public.epi_deliveries;

CREATE POLICY "Service roles can create epi deliveries" ON public.epi_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can update epi deliveries" ON public.epi_deliveries
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can delete epi deliveries" ON public.epi_deliveries
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));

-- epi_delivery_items
DROP POLICY IF EXISTS "Admin and Almoxarife can create epi delivery items" ON public.epi_delivery_items;
DROP POLICY IF EXISTS "Admin and Almoxarife can update epi delivery items" ON public.epi_delivery_items;
DROP POLICY IF EXISTS "Admin and Almoxarife can delete epi delivery items" ON public.epi_delivery_items;

CREATE POLICY "Service roles can create epi delivery items" ON public.epi_delivery_items
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can update epi delivery items" ON public.epi_delivery_items
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
CREATE POLICY "Service roles can delete epi delivery items" ON public.epi_delivery_items
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'almoxarife') OR has_role(auth.uid(), 'compras'));
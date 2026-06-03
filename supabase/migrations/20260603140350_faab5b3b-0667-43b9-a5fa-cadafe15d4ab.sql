
-- Employees: restrict SELECT to admin/almoxarife/compras
DROP POLICY IF EXISTS "Authorized users can view employees" ON public.employees;
CREATE POLICY "Service roles can view employees"
ON public.employees FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
);

-- Suppliers: restrict to admin/almoxarife/compras for all operations
DROP POLICY IF EXISTS "Authorized users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authorized users can create suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authorized users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authorized users can delete suppliers" ON public.suppliers;

CREATE POLICY "Service roles can view suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
);

CREATE POLICY "Service roles can create suppliers"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
);

CREATE POLICY "Service roles can update suppliers"
ON public.suppliers FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'almoxarife'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
);

CREATE POLICY "Service roles can delete suppliers"
ON public.suppliers FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'compras'::app_role)
);

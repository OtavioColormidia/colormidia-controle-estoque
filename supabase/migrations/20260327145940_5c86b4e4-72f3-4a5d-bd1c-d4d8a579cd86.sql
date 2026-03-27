ALTER TABLE public.purchases
  ADD COLUMN discount numeric DEFAULT 0,
  ADD COLUMN ipi numeric DEFAULT 0,
  ADD COLUMN frete numeric DEFAULT 0;
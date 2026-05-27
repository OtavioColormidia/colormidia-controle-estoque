
ALTER TABLE public.epis ADD COLUMN IF NOT EXISTS default_validity_months integer;
ALTER TABLE public.epi_delivery_items ADD COLUMN IF NOT EXISTS validity_months integer;
ALTER TABLE public.epi_delivery_items ADD COLUMN IF NOT EXISTS expiration_date date;

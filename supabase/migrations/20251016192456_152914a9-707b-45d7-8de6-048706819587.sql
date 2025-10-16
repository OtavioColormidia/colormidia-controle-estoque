-- Add expected_delivery_date column to purchases table
ALTER TABLE public.purchases 
ADD COLUMN expected_delivery_date timestamp with time zone;
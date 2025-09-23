-- Add updated_by column to purchases table for tracking updates
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS updated_by UUID DEFAULT NULL;
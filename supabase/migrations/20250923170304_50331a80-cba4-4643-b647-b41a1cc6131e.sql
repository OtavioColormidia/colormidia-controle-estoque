-- Add product_name column to stock_movements table
ALTER TABLE public.stock_movements
ADD COLUMN product_name TEXT;

-- Update existing records with product names
UPDATE public.stock_movements sm
SET product_name = p.name
FROM public.products p
WHERE sm.product_id = p.id AND sm.product_name IS NULL;
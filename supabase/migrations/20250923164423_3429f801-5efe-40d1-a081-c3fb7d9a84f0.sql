-- Modify purchases table to allow text supplier name
ALTER TABLE public.purchases 
  ALTER COLUMN supplier_id DROP NOT NULL,
  ADD COLUMN supplier_name TEXT;

-- Modify purchase_items table to allow text product name  
ALTER TABLE public.purchase_items
  ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN product_name TEXT;

-- Update existing records to have supplier and product names
UPDATE public.purchases p
SET supplier_name = s.name
FROM public.suppliers s
WHERE p.supplier_id = s.id AND p.supplier_name IS NULL;

UPDATE public.purchase_items pi
SET product_name = p.name
FROM public.products p
WHERE pi.product_id = p.id AND pi.product_name IS NULL;
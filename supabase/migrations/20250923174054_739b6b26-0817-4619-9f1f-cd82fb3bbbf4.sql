-- Tornar product_id opcional na tabela stock_movements
ALTER TABLE public.stock_movements 
ALTER COLUMN product_id DROP NOT NULL;
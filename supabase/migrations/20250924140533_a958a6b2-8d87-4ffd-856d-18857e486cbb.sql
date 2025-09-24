-- Adicionar campo trade_name (Nome Fantasia) na tabela suppliers
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS trade_name text;
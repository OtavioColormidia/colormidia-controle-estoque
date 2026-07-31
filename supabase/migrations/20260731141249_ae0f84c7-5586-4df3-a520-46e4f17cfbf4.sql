ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS hidden_from_public boolean NOT NULL DEFAULT false;
ALTER TABLE public.form_responses ADD COLUMN IF NOT EXISTS purchase_id uuid;

DROP VIEW IF EXISTS public.public_recent_purchases;
CREATE VIEW public.public_recent_purchases
WITH (security_invoker = off) AS
SELECT
  p.id,
  p.date,
  p.supplier_name,
  p.document_number,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('name', pi.product_name, 'quantity', pi.quantity) ORDER BY pi.created_at)
     FROM public.purchase_items pi WHERE pi.purchase_id = p.id),
    '[]'::jsonb
  ) AS items
FROM public.purchases p
WHERE p.date >= now() - interval '15 days'
  AND p.hidden_from_public = false
  AND NOT EXISTS (SELECT 1 FROM public.form_responses fr WHERE fr.purchase_id = p.id);

GRANT SELECT ON public.public_recent_purchases TO anon, authenticated;
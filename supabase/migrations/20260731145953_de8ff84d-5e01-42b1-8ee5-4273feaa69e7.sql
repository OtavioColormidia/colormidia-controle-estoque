DROP VIEW IF EXISTS public.public_recent_purchases;
CREATE VIEW public.public_recent_purchases
WITH (security_invoker = off) AS
SELECT
  p.id,
  p.date,
  p.created_at,
  p.supplier_name,
  COALESCE(NULLIF(pr.display_name, ''), split_part(COALESCE(pr.email, ''), '@', 1)) AS creator_name,
  p.document_number,
  (SELECT string_agg(trim(trailing '.' from trim(trailing '0' from to_char(pi.quantity, 'FM999999990.00'))) || 'x ' || COALESCE(pi.product_name, ''), E'\n' ORDER BY pi.created_at)
   FROM public.purchase_items pi WHERE pi.purchase_id = p.id) AS items_summary
FROM public.purchases p
LEFT JOIN public.profiles pr ON pr.user_id = p.created_by
WHERE p.date >= now() - interval '15 days'
  AND p.hidden_from_public = false
  AND NOT EXISTS (SELECT 1 FROM public.form_responses fr WHERE fr.purchase_id = p.id);

GRANT SELECT ON public.public_recent_purchases TO anon, authenticated;
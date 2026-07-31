CREATE OR REPLACE VIEW public.public_recent_purchases AS
SELECT
  p.id,
  p.date,
  p.created_at,
  p.supplier_name,
  p.document_number,
  p.status,
  COALESCE(
    (SELECT string_agg(
        CASE WHEN pi.quantity IS NOT NULL AND pi.quantity > 0
             THEN (trim(to_char(pi.quantity, 'FM999999999.999')) || 'x ' || COALESCE(pi.product_name, ''))
             ELSE COALESCE(pi.product_name, '') END,
        E'\n' ORDER BY pi.created_at)
     FROM public.purchase_items pi
     WHERE pi.purchase_id = p.id),
    ''
  ) AS items_summary
FROM public.purchases p
WHERE p.date >= (now() - interval '5 days');

GRANT SELECT ON public.public_recent_purchases TO anon, authenticated;
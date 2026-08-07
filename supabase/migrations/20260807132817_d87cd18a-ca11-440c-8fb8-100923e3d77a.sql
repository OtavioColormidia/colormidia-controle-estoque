DROP VIEW public.public_recent_purchases;
CREATE VIEW public.public_recent_purchases AS
 SELECT p.id,
    p.date,
    p.created_at,
    p.delivered_at,
    p.supplier_name,
    COALESCE(NULLIF(pr.display_name, ''::text), split_part(COALESCE(pr.email, ''::text), '@'::text, 1)) AS creator_name,
    p.document_number,
    ( SELECT string_agg((TRIM(TRAILING '.'::text FROM TRIM(TRAILING '0'::text FROM to_char(pi.quantity, 'FM999999990.00'::text))) || 'x '::text) || COALESCE(pi.product_name, ''::text), '
'::text ORDER BY pi.created_at)
           FROM purchase_items pi
          WHERE pi.purchase_id = p.id) AS items_summary
   FROM purchases p
     LEFT JOIN profiles pr ON pr.user_id = p.created_by
  WHERE p.date >= (now() - '15 days'::interval) AND p.hidden_from_public = false AND NOT (EXISTS ( SELECT 1
           FROM form_responses fr
          WHERE fr.purchase_id = p.id));

ALTER VIEW public.public_recent_purchases SET (security_invoker = off);
GRANT SELECT ON public.public_recent_purchases TO anon, authenticated;
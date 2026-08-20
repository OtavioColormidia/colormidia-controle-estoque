ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS order_partial boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_note text;
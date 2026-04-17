-- Create form_responses table
CREATE TABLE public.form_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_name TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sheet_row INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_form_responses_form_name ON public.form_responses(form_name);
CREATE INDEX idx_form_responses_submitted_at ON public.form_responses(submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

-- Policies: only admin / compras / almoxarife can view
CREATE POLICY "Authorized roles can view form responses"
ON public.form_responses
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'compras')
  OR public.has_role(auth.uid(), 'almoxarife')
);

-- Only admins can delete
CREATE POLICY "Admins can delete form responses"
ON public.form_responses
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE policy => only service role (edge function) can write

-- Enable realtime
ALTER TABLE public.form_responses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_responses;
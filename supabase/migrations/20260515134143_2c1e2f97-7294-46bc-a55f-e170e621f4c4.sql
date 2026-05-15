CREATE TABLE public.user_sidebar_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  section_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_orders jsonb NOT NULL DEFAULT '{}'::jsonb,
  open_sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_sidebar_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sidebar preferences"
ON public.user_sidebar_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sidebar preferences"
ON public.user_sidebar_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sidebar preferences"
ON public.user_sidebar_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sidebar preferences"
ON public.user_sidebar_preferences FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_sidebar_preferences_updated_at
BEFORE UPDATE ON public.user_sidebar_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add 'visualizador' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'visualizador';

-- Create function to assign default role when user is authorized
CREATE OR REPLACE FUNCTION public.assign_default_role_on_authorization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If user is being authorized and doesn't have a role yet, assign 'visualizador'
  IF NEW.is_authorized = true AND OLD.is_authorized = false THEN
    -- Check if user doesn't have any role
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id
    ) THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.user_id, 'visualizador');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger to assign default role on authorization
DROP TRIGGER IF EXISTS on_user_authorized ON public.profiles;
CREATE TRIGGER on_user_authorized
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role_on_authorization();
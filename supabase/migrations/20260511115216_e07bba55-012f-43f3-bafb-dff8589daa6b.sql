-- Prevent users from escalating privileges via profile update
CREATE OR REPLACE FUNCTION public.prevent_self_authorization_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if executed by an admin
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- For non-admins, block changes to is_authorized
  IF NEW.is_authorized IS DISTINCT FROM OLD.is_authorized THEN
    RAISE EXCEPTION 'Not allowed to change authorization status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_authorization_change_trigger ON public.profiles;
CREATE TRIGGER prevent_self_authorization_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_authorization_change();

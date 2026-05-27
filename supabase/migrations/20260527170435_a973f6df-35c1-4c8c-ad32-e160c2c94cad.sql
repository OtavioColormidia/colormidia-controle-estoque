-- Lock down profiles: prevent self-creation of authorized profiles and self-elevation via UPDATE

-- INSERT policy: users can only create their own profile, never authorized
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_authorized IS NOT TRUE);

-- UPDATE policy: tighten WITH CHECK so the new row's is_authorized must match the existing value
-- (defense in depth alongside the prevent_self_authorization_change trigger)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND is_authorized IS NOT DISTINCT FROM (
    SELECT p.is_authorized FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- Ensure the trigger that blocks self-authorization is attached and runs BEFORE UPDATE
DROP TRIGGER IF EXISTS prevent_self_authorization_change_trigger ON public.profiles;
CREATE TRIGGER prevent_self_authorization_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_authorization_change();
-- Free staging only: reduce exposed PUBLIC grants on the auth trigger function.
-- Executing this trigger is reserved to the auth.users trigger owner.
REVOKE ALL ON FUNCTION public.woffu_new_user_profile() FROM PUBLIC, anon, authenticated;

-- Explicit deny for authenticated reads of invite tokens. No SELECT grant exists.
CREATE POLICY invites_no_client_access ON public.invites
  FOR SELECT TO authenticated USING (false);

-- No RLS bypassing view: members is security_invoker.
ALTER VIEW public.members SET (security_invoker = true);

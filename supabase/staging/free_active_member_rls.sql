-- WOFFU V2 Free staging: inactive accounts must not read internal data via PostgREST.
-- Route-level checks alone are insufficient because browsers can access the Data API.
CREATE OR REPLACE FUNCTION public.is_active_woffu_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_woffu_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_woffu_member() TO authenticated;

ALTER POLICY profiles_team_read ON public.profiles TO authenticated
  USING ((SELECT public.is_active_woffu_member()));
ALTER POLICY projects_team_read ON public.projects TO authenticated
  USING ((SELECT public.is_active_woffu_member()));
ALTER POLICY requests_team_read ON public.status_change_requests TO authenticated
  USING ((SELECT public.is_active_woffu_member()));
ALTER POLICY logs_team_read ON public.project_logs TO authenticated
  USING ((SELECT public.is_active_woffu_member()));
ALTER POLICY notices_team_read ON public.team_notices TO authenticated
  USING ((SELECT public.is_active_woffu_member()));

ALTER POLICY requests_assignee_insert ON public.status_change_requests TO authenticated
  WITH CHECK (
    (SELECT public.is_active_woffu_member())
    AND requested_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.assignee_id = (SELECT auth.uid())
    )
  );
ALTER POLICY logs_own_insert ON public.project_logs TO authenticated
  WITH CHECK ((SELECT public.is_active_woffu_member()) AND actor_id = (SELECT auth.uid()));
ALTER POLICY notifications_own_read ON public.notifications TO authenticated
  USING ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()));
ALTER POLICY notifications_own_update ON public.notifications TO authenticated
  USING ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()));
ALTER POLICY push_tokens_own ON public.push_tokens TO authenticated
  USING ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()));
ALTER POLICY push_subscriptions_own ON public.push_subscriptions TO authenticated
  USING ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.is_active_woffu_member()) AND user_id = (SELECT auth.uid()));

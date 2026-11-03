-- Additional WOFFU V2 guardrails for the isolated Free Staging schema.
-- This script is not an automatic Production migration.
-- Prevent forged approval requests and private activity log injection.
-- Keep the API as the UX layer while RLS rejects malformed direct Data API calls.

ALTER POLICY requests_assignee_insert ON public.status_change_requests
TO authenticated
WITH CHECK (
  (SELECT public.is_active_woffu_member())
  AND requested_by = (SELECT auth.uid())
  AND request_status = 'PENDING'
  AND approved_by IS NULL AND approved_at IS NULL
  AND rejected_by IS NULL AND rejected_at IS NULL AND reject_reason IS NULL
  AND (status IS NULL OR status = 'PENDING')
  AND to_status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')
  AND to_status <> from_status
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id
      AND p.assignee_id = (SELECT auth.uid())
      AND p.status = from_status
      AND p.status <> 'COMPLETED'
  )
);

-- A racing browser tab must not enqueue duplicate conflicting approvals.
CREATE UNIQUE INDEX IF NOT EXISTS idx_woffu_one_pending_request_per_project
ON public.status_change_requests (project_id)
WHERE request_status = 'PENDING';

-- A client may acknowledge its own notifications, not edit their content.
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE(is_read) ON public.notifications TO authenticated;

-- Activity log is writeable only by the responsible editor or a manager.
-- The actor must always equal the authenticated user.
ALTER POLICY logs_own_insert ON public.project_logs
TO authenticated
WITH CHECK (
  (SELECT public.is_active_woffu_member())
  AND actor_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_id AND
      (p.assignee_id = (SELECT auth.uid()) OR (SELECT public.is_leader()))
  )
);

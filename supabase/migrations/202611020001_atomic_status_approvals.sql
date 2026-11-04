-- WOFFU OS V2: Atomic status approval (staging-first migration)
--
-- Apply this migration in a staging Supabase project before deploying V2.
-- This function uses auth.uid() for the actor; a client cannot select an actor.
-- It is SECURITY DEFINER because it must atomically update two RLS-protected tables.
-- Restrict EXECUTE to authenticated users and re-check active manager role inside.

ALTER TABLE public.status_change_requests
  ADD COLUMN IF NOT EXISTS reject_reason text,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

CREATE OR REPLACE FUNCTION public.woffu_process_status_approval(
  p_request_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_request public.status_change_requests%ROWTYPE;
  v_project public.projects%ROWTYPE;
  v_action text := upper(trim(coalesce(p_action, '')));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED', 'message', 'Sign in required');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_actor
      AND is_active = true
      AND role::text IN ('LEADER', 'ADMIN')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'Manager access required');
  END IF;

  IF v_action NOT IN ('APPROVE', 'REJECT') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ACTION', 'message', 'Invalid action');
  END IF;

  IF v_action = 'REJECT' AND (v_reason IS NULL OR char_length(v_reason) > 2000) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_REASON', 'message', 'Reject reason is required (max 2000 characters)');
  END IF;

  -- Only one manager can claim a pending request at a time.
  SELECT * INTO v_request
  FROM public.status_change_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Approval request not found');
  END IF;

  IF v_request.request_status IS DISTINCT FROM 'PENDING' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_PROCESSED', 'message', 'Request already processed');
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = v_request.project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PROJECT_NOT_FOUND', 'message', 'Project not found');
  END IF;

  IF v_action = 'APPROVE' THEN
    IF v_project.status IS DISTINCT FROM v_request.from_status THEN
      RETURN jsonb_build_object('ok', false, 'code', 'STALE_PROJECT', 'message', 'Project status changed; approval was not applied');
    END IF;

    UPDATE public.projects
    SET status = v_request.to_status
    WHERE id = v_request.project_id;

    UPDATE public.status_change_requests
    SET request_status = 'APPROVED',
        approved_by = v_actor,
        approved_at = now()
    WHERE id = p_request_id;
  ELSE
    -- Rejection may close a stale pending request without changing the project.
    UPDATE public.status_change_requests
    SET request_status = 'REJECTED',
        reject_reason = v_reason,
        rejected_by = v_actor,
        rejected_at = now()
    WHERE id = p_request_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_request.id,
    'project_id', v_project.id,
    'project_title', v_project.title,
    'requested_by', v_request.requested_by,
    'from_status', v_request.from_status,
    'to_status', v_request.to_status,
    'action', v_action,
    'reason', v_reason
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.woffu_process_status_approval(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.woffu_process_status_approval(uuid, text, text)
  TO authenticated;

COMMENT ON FUNCTION public.woffu_process_status_approval(uuid, text, text)
  IS 'Atomic approval/rejection of WOFFU OS status requests; active manager only.';

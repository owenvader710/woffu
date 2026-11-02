-- WOFFU V2: Repair enum compatibility for existing staging deployments.
-- project_status has COMPLETED but no CANCELLED; the old comparison raised 22P02
-- for every draft submission, even when project was IN_PROGRESS.
-- Future installs use the corrected original Phase 3 migration.
CREATE OR REPLACE FUNCTION public.woffu_submit_project_draft(
  p_project_id uuid,
  p_submission_url text,
  p_submission_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_project public.projects%ROWTYPE;
  v_last public.project_draft_reviews%ROWTYPE;
  v_number integer;
  v_url text := btrim(coalesce(p_submission_url, ''));
  v_note text := nullif(btrim(coalesce(p_submission_note, '')), '');
  v_new public.project_draft_reviews%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_actor AND is_active = true
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF char_length(v_url) < 12 OR char_length(v_url) > 2048 OR
     v_url !~* '^https://[^[:space:]]+$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_URL');
  END IF;
  IF char_length(coalesce(v_note, '')) > 4000 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_NOTE');
  END IF;

  -- Lock the project first for concurrent submissions/review decisions.
  SELECT * INTO v_project FROM public.projects
  WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_project.assignee_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF v_project.status = 'COMPLETED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PROJECT_CLOSED');
  END IF;

  SELECT * INTO v_last FROM public.project_draft_reviews
  WHERE project_id = p_project_id
  ORDER BY draft_number DESC LIMIT 1;

  IF FOUND AND v_last.review_status IN ('SUBMITTED', 'APPROVED') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVIEW_NOT_READY');
  END IF;

  v_number := coalesce(v_last.draft_number, 0) + 1;
  IF v_number > 4 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MAX_DRAFTS_REACHED');
  END IF;

  INSERT INTO public.project_draft_reviews
    (project_id, draft_number, submitted_by, submission_url, submission_note)
  VALUES (p_project_id, v_number, v_actor, v_url, v_note)
  RETURNING * INTO v_new;

  RETURN jsonb_build_object(
    'ok', true, 'id', v_new.id, 'project_id', v_project.id,
    'project_title', v_project.title, 'draft_number', v_number,
    'review_status', v_new.review_status, 'reviewer_id', v_project.reviewer_id
  );
END;
$function$;

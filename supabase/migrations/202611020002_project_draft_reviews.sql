-- WOFFU OS V2 Phase 3: draft/review lifecycle, separate from project status.
-- STAGING FIRST. Run AFTER 202611020001_atomic_status_approvals.sql.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.project_draft_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  draft_number integer NOT NULL CHECK (draft_number BETWEEN 1 AND 4),
  review_status text NOT NULL DEFAULT 'SUBMITTED'
    CHECK (review_status IN ('SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED')),
  submitted_by uuid NOT NULL REFERENCES public.profiles(id),
  submission_url text NOT NULL,
  submission_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  feedback text,
  UNIQUE (project_id, draft_number)
);

CREATE INDEX IF NOT EXISTS idx_woffu_drafts_project
  ON public.project_draft_reviews (project_id, draft_number DESC);
CREATE INDEX IF NOT EXISTS idx_woffu_drafts_pending
  ON public.project_draft_reviews (created_at DESC) WHERE review_status = 'SUBMITTED';

ALTER TABLE public.project_draft_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_draft_reviews FROM PUBLIC, anon;
GRANT SELECT ON public.project_draft_reviews TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.project_draft_reviews FROM authenticated;

DROP POLICY IF EXISTS "woffu_drafts_read_related" ON public.project_draft_reviews;
CREATE POLICY "woffu_drafts_read_related"
ON public.project_draft_reviews
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.profiles actor ON actor.id = (SELECT auth.uid())
    WHERE p.id = project_id
      AND actor.is_active = true
      AND (
        p.assignee_id = actor.id
        OR p.reviewer_id = actor.id
        OR actor.role::text IN ('ADMIN', 'LEADER')
      )
  )
);

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
  IF v_project.status IN ('COMPLETED', 'CANCELLED') THEN
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

CREATE OR REPLACE FUNCTION public.woffu_review_project_draft(
  p_review_id uuid,
  p_action text,
  p_feedback text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_project_id uuid;
  v_project public.projects%ROWTYPE;
  v_review public.project_draft_reviews%ROWTYPE;
  v_action text := upper(btrim(coalesce(p_action, '')));
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED');
  END IF;

  SELECT role INTO v_actor_role FROM public.profiles
  WHERE id = v_actor AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF v_action NOT IN ('APPROVE', 'REQUEST_CHANGES') OR
     char_length(coalesce(v_feedback, '')) > 4000 OR
     (v_action = 'REQUEST_CHANGES' AND v_feedback IS NULL) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_DECISION');
  END IF;

  SELECT project_id INTO v_project_id FROM public.project_draft_reviews
  WHERE id = p_review_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  -- Lock project before review to use the same locking order as submit.
  SELECT * INTO v_project FROM public.projects
  WHERE id = v_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  IF v_actor_role NOT IN ('ADMIN', 'LEADER') AND
     v_project.reviewer_id IS DISTINCT FROM v_actor THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;
  IF v_project.assignee_id = v_actor AND
     v_actor_role NOT IN ('ADMIN', 'LEADER') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  SELECT * INTO v_review FROM public.project_draft_reviews
  WHERE id = p_review_id FOR UPDATE;
  IF v_review.review_status IS DISTINCT FROM 'SUBMITTED' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_REVIEWED');
  END IF;

  UPDATE public.project_draft_reviews
  SET review_status = CASE WHEN v_action = 'APPROVE'
                          THEN 'APPROVED' ELSE 'CHANGES_REQUESTED' END,
      reviewed_by = v_actor, reviewed_at = now(), feedback = v_feedback
  WHERE id = p_review_id;

  RETURN jsonb_build_object(
    'ok', true, 'id', p_review_id, 'project_id', v_project.id,
    'project_title', v_project.title,
    'draft_number', v_review.draft_number,
    'review_status', CASE WHEN v_action = 'APPROVE'
                          THEN 'APPROVED' ELSE 'CHANGES_REQUESTED' END,
    'submitted_by', v_review.submitted_by, 'feedback', v_feedback
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.woffu_submit_project_draft(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.woffu_review_project_draft(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.woffu_submit_project_draft(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.woffu_review_project_draft(uuid, text, text) TO authenticated;

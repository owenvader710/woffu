-- PostgreSQL integration tests for WOFFU OS V2 migrations.
-- The runner uses an ephemeral PostgreSQL service; NO Supabase credentials.
GRANT SELECT ON public.status_change_requests TO authenticated;
UPDATE public.projects
SET reviewer_id = '10000000-0000-4000-8000-000000000003'
WHERE id = '20000000-0000-4000-8000-000000000001';

SET ROLE authenticated;

DO $test$
DECLARE
  result jsonb;
  review_id uuid;
  newer_review_id uuid;
  current_status text;
  current_request_status text;
  observed_reason text;
  visible_count integer;
  project_id constant uuid := '20000000-0000-4000-8000-000000000001';
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000001', 'APPROVE', null
  );
  IF result->>'code' IS DISTINCT FROM 'UNAUTHORIZED' THEN
    RAISE EXCEPTION 'Unauthenticated request was not denied: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000001', 'APPROVE', null
  );
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'Member can approve status request: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000006', true);
  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000001', 'APPROVE', null
  );
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'Inactive leader can approve status request: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000001', 'APPROVE', null
  );
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Leader could not approve: %', result;
  END IF;

  SELECT status INTO current_status FROM public.projects WHERE id = project_id;
  SELECT request_status INTO current_request_status FROM public.status_change_requests
  WHERE id = '30000000-0000-4000-8000-000000000001';
  IF current_status <> 'IN_PROGRESS' OR current_request_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Approval did not update both tables: %, %', current_status, current_request_status;
  END IF;

  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000001', 'APPROVE', null
  );
  IF result->>'code' IS DISTINCT FROM 'ALREADY_PROCESSED' THEN
    RAISE EXCEPTION 'Duplicate approval not rejected: %', result;
  END IF;

  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000002', 'APPROVE', null
  );
  IF result->>'code' IS DISTINCT FROM 'STALE_PROJECT' THEN
    RAISE EXCEPTION 'Stale status request was accepted: %', result;
  END IF;

  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000003', 'REJECT', '  '
  );
  IF result->>'code' IS DISTINCT FROM 'INVALID_REASON' THEN
    RAISE EXCEPTION 'Empty rejection reason was accepted: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000005', true);
  result := public.woffu_process_status_approval(
    '30000000-0000-4000-8000-000000000003', 'REJECT', 'Needs correction'
  );
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Admin rejection failed: %', result;
  END IF;
  SELECT status INTO current_status FROM public.projects WHERE id = project_id;
  SELECT reject_reason INTO observed_reason FROM public.status_change_requests
  WHERE id = '30000000-0000-4000-8000-000000000003';
  IF current_status <> 'IN_PROGRESS' OR observed_reason <> 'Needs correction' THEN
    RAISE EXCEPTION 'Rejection changed project status or dropped reason';
  END IF;

  -- Draft review: the assignee submits a URL, not a project status change.
  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
  result := public.woffu_submit_project_draft(
    project_id, 'https://drive.google.com/file/d/first', 'first cut'
  );
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'Unrelated member submitted draft: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
  result := public.woffu_submit_project_draft(
    project_id, 'http://example.test/insecure', null
  );
  IF result->>'code' IS DISTINCT FROM 'INVALID_URL' THEN
    RAISE EXCEPTION 'HTTP URL accepted: %', result;
  END IF;
  result := public.woffu_submit_project_draft(
    project_id, 'https://drive.google.com/file/d/first', 'first cut'
  );
  IF result->>'ok' IS DISTINCT FROM 'true' OR (result->>'draft_number')::int <> 1 THEN
    RAISE EXCEPTION 'Draft 1 submit failed: %', result;
  END IF;
  review_id := (result->>'id')::uuid;
  result := public.woffu_submit_project_draft(
    project_id, 'https://drive.google.com/file/d/duplicate', null
  );
  IF result->>'code' IS DISTINCT FROM 'REVIEW_NOT_READY' THEN
    RAISE EXCEPTION 'Duplicate pending draft was accepted: %', result;
  END IF;

  -- RLS prevents unrelated members from reading Draft QC rows.
  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
  SELECT count(*) INTO visible_count FROM public.project_draft_reviews
  WHERE project_id = project_id;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'Unrelated user could read draft: % rows', visible_count;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
  SELECT count(*) INTO visible_count FROM public.project_draft_reviews
  WHERE project_id = project_id;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'Assigned reviewer cannot read submitted draft: %', visible_count;
  END IF;

  result := public.woffu_review_project_draft(review_id, 'REQUEST_CHANGES', null);
  IF result->>'code' IS DISTINCT FROM 'INVALID_DECISION' THEN
    RAISE EXCEPTION 'Missing revision feedback accepted: %', result;
  END IF;
  result := public.woffu_review_project_draft(review_id, 'REQUEST_CHANGES', 'Fix captions');
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Assigned reviewer could not request changes: %', result;
  END IF;
  result := public.woffu_review_project_draft(review_id, 'APPROVE', null);
  IF result->>'code' IS DISTINCT FROM 'ALREADY_REVIEWED' THEN
    RAISE EXCEPTION 'Already-reviewed draft approved twice: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
  result := public.woffu_submit_project_draft(
    project_id, 'https://drive.google.com/file/d/second', 'revised cut'
  );
  IF result->>'ok' IS DISTINCT FROM 'true' OR (result->>'draft_number')::int <> 2 THEN
    RAISE EXCEPTION 'Draft 2 did not advance: %', result;
  END IF;
  newer_review_id := (result->>'id')::uuid;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
  result := public.woffu_review_project_draft(newer_review_id, 'APPROVE', null);
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'Unrelated member reviewed draft: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
  result := public.woffu_review_project_draft(newer_review_id, 'APPROVE', 'Approved for client');
  IF result->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Assigned reviewer approval failed: %', result;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
  result := public.woffu_submit_project_draft(
    project_id, 'https://drive.google.com/file/d/third', null
  );
  IF result->>'code' IS DISTINCT FROM 'REVIEW_NOT_READY' THEN
    RAISE EXCEPTION 'Approved Draft still allowed a new round: %', result;
  END IF;
  SELECT status INTO current_status FROM public.projects WHERE id = project_id;
  IF current_status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Draft review should not change project status: %', current_status;
  END IF;

  RAISE NOTICE 'WOFFU DB integration tests: PASS (approval, reject, roles, RLS, drafts)';
END;
$test$;

RESET ROLE;

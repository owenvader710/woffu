-- Verify Data API callers cannot forge approvals, logs or notifications.
-- Run after free_staging_checks.sql + free_active_member_rls.sql.
-- Existing fixtures: LEADER 100...001, MEMBER 100...002, project 200...001.

DO $verify$
BEGIN
  IF has_column_privilege('authenticated', 'public.notifications', 'title', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated caller can alter notification content';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.notifications', 'is_read', 'UPDATE') THEN
    RAISE EXCEPTION 'Authenticated user cannot mark notifications read';
  END IF;
END $verify$;

UPDATE public.profiles SET is_active = true
WHERE id='10000000-0000-4000-8000-000000000002';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);

DO $verify$
DECLARE accepted boolean;
BEGIN
  accepted := false;
  BEGIN
    INSERT INTO public.status_change_requests
      (project_id, requested_by, from_status, to_status, request_status, approved_by)
    VALUES ('20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'TODO','IN_PROGRESS','APPROVED',
      '10000000-0000-4000-8000-000000000001');
    accepted := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF accepted THEN RAISE EXCEPTION 'Member forged APPROVED request'; END IF;

  accepted := false;
  BEGIN
    INSERT INTO public.status_change_requests
      (project_id, requested_by, from_status, to_status, request_status)
    VALUES ('20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'IN_PROGRESS','COMPLETED','PENDING');
    accepted := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF accepted THEN RAISE EXCEPTION 'Member inserted request with stale from_status'; END IF;

  INSERT INTO public.status_change_requests
    (project_id, requested_by, from_status, to_status, request_status)
  VALUES ('20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'TODO','IN_PROGRESS','PENDING');

  accepted := false;
  BEGIN
    INSERT INTO public.status_change_requests
      (project_id, requested_by, from_status, to_status, request_status)
    VALUES ('20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'TODO','BLOCKED','PENDING');
    accepted := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF accepted THEN RAISE EXCEPTION 'Duplicate PENDING request was accepted'; END IF;
  RAISE NOTICE 'Status-request RLS and unique index: PASS';
END $verify$;

DO $verify$
DECLARE accepted boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.project_logs(project_id,actor_id,action,message)
    VALUES ('20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001','FORGED','malicious');
    accepted := true;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF accepted THEN RAISE EXCEPTION 'Member forged manager project log'; END IF;

  INSERT INTO public.project_logs(project_id,actor_id,action,message)
  VALUES ('20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002','STATUS_REQUESTED','legitimate request');
END $verify$;
RESET ROLE;

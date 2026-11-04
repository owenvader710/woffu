-- Run against ephemeral CI database only, after latest workflow migrations.
-- Use fixture leader 100...001 / member 100...002, no real credentials.
DO $verify$
DECLARE
  blocked boolean := false;
  constraint_seen text;
BEGIN
  BEGIN
    INSERT INTO public.status_change_requests
      (project_id, requested_by, from_status, to_status, request_status)
    VALUES ('20000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'TODO', 'COMPLETED', 'PENDING');
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS constraint_seen = CONSTRAINT_NAME;
    blocked := constraint_seen = 'status_requests_must_start_before_completion';
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'Direct TODO-to-COMPLETED request was not blocked by the expected check constraint';
  END IF;
  RAISE NOTICE 'Direct transition constraint: PASS';
END $verify$;

UPDATE public.profiles SET is_active = true
WHERE id='10000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $verify$
DECLARE result jsonb;
BEGIN
  IF public.is_leader() OR NOT public.is_active_woffu_member() THEN
    RAISE EXCEPTION 'Member privilege helpers returned incorrect values';
  END IF;
  result := public.woffu_process_status_approval(
    '00000000-0000-4000-8000-000000000000'::uuid,'APPROVE',NULL);
  IF result->>'code' IS DISTINCT FROM 'FORBIDDEN' THEN
    RAISE EXCEPTION 'Member was not denied atomic approval: %',result;
  END IF;
  RAISE NOTICE 'Member cannot approve via privileged RPC: PASS';
END $verify$;
RESET ROLE;

DO $verify$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='invites'
        AND column_name='display_name') THEN
    RAISE EXCEPTION 'Invitation display name migration missing';
  END IF;
  INSERT INTO public.invites(email,display_name,role,department,token_hash,expires_at)
  VALUES('named@demo.invalid','Test Member','MEMBER','VIDEO',
     repeat('b',64),now()+interval '1 day');
  IF NOT EXISTS (SELECT 1 FROM public.invites
      WHERE email='named@demo.invalid' AND display_name='Test Member') THEN
    RAISE EXCEPTION 'Invitation name was not persisted';
  END IF;
  RAISE NOTICE 'Named invitations: PASS';
END $verify$;

-- End-to-end RLS test on ephemeral Free staging schema; no real users.
-- Run after free_staging_checks.sql and free_active_member_rls.sql.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $verify$
BEGIN
  IF (SELECT count(*) FROM public.projects) <> 1 THEN
    RAISE EXCEPTION 'Active member cannot read their project';
  END IF;
  IF (SELECT count(*) FROM public.profiles) <> 2 THEN
    RAISE EXCEPTION 'Active member cannot read team profiles';
  END IF;
END $verify$;
RESET ROLE;

UPDATE public.profiles SET is_active = false
WHERE id = '10000000-0000-4000-8000-000000000002';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $verify$
BEGIN
  IF public.is_active_woffu_member() THEN
    RAISE EXCEPTION 'Inactive member still passes membership check';
  END IF;
  IF (SELECT count(*) FROM public.projects) > 0 OR
     (SELECT count(*) FROM public.profiles) > 0 OR
     (SELECT count(*) FROM public.team_notices) > 0 OR
     (SELECT count(*) FROM public.status_change_requests) > 0 THEN
    RAISE EXCEPTION 'Inactive member can access internal team data';
  END IF;
  IF has_table_privilege('authenticated','public.invites','SELECT') THEN
    RAISE EXCEPTION 'Invites exposed to authenticated role';
  END IF;
  RAISE NOTICE 'Inactive account blocked from direct Data API: PASS';
END $verify$;
RESET ROLE;

-- SQL contract for the API's one-time invitation claim:
-- UPDATE WHERE used_at IS NULL must claim once and zero rows thereafter.
INSERT INTO public.invites(email,role,department,token_hash,expires_at)
VALUES('one-time@demo.invalid','MEMBER','VIDEO',repeat('a',64),now() + interval '1 day');
DO $verify$
DECLARE claimed integer;
BEGIN
  UPDATE public.invites SET used_at=now()
  WHERE token_hash=repeat('a',64) AND used_at IS NULL AND expires_at > now();
  GET DIAGNOSTICS claimed = ROW_COUNT;
  IF claimed <> 1 THEN RAISE EXCEPTION 'First invite claim must succeed'; END IF;

  UPDATE public.invites SET used_at=now()
  WHERE token_hash=repeat('a',64) AND used_at IS NULL AND expires_at > now();
  GET DIAGNOSTICS claimed = ROW_COUNT;
  IF claimed <> 0 THEN RAISE EXCEPTION 'Duplicate invite claim was accepted'; END IF;
  RAISE NOTICE 'One-time invitation claim: PASS';
END $verify$;

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id='project-files'
      AND public=true AND file_size_limit=5242880
      AND 'application/pdf'=ANY(allowed_mime_types)
  ) THEN
    RAISE EXCEPTION 'Public preview bucket not configured for small PDF assets';
  END IF;
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id='team-notices'
      AND (file_size_limit IS DISTINCT FROM 5242880 OR allowed_mime_types IS NULL)
  ) THEN
    RAISE EXCEPTION 'Team notice free-tier upload limits missing';
  END IF;
  RAISE NOTICE 'Public preview Storage quotas: PASS';
END $verify$;

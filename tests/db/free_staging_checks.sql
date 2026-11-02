-- Staging baseline smoke checks. Execute after both V2 migrations.
INSERT INTO auth.users(id,email) VALUES
('10000000-0000-4000-8000-000000000001','leader@demo.invalid'),
('10000000-0000-4000-8000-000000000002','member@demo.invalid');
-- Fake accounts become MEMBER by default. Promote only a local fake test identity.
UPDATE public.profiles SET role='LEADER'
WHERE id='10000000-0000-4000-8000-000000000001';

DO $$
DECLARE
  r record;
  profile_count integer;
BEGIN
  SELECT count(*) INTO profile_count FROM public.profiles;
  IF profile_count <> 2 THEN RAISE EXCEPTION 'Auth signup trigger did not create profiles'; END IF;
  FOR r IN
    SELECT tablename, rowsecurity FROM pg_tables
    WHERE schemaname='public' AND tablename IN
      ('profiles','projects','status_change_requests','project_draft_reviews',
       'project_logs','team_notices','notifications','invites','push_tokens',
       'push_subscriptions')
  LOOP
    IF NOT r.rowsecurity THEN RAISE EXCEPTION 'RLS disabled: %', r.tablename; END IF;
  END LOOP;
  IF has_table_privilege('anon','public.profiles','SELECT') OR
     has_table_privilege('anon','public.projects','SELECT') OR
     has_table_privilege('anon','public.invites','SELECT') THEN
    RAISE EXCEPTION 'Anonymous access to internal tables unexpectedly enabled';
  END IF;
  IF has_function_privilege('authenticated','public.woffu_new_user_profile()','EXECUTE') THEN
    RAISE EXCEPTION 'Auth trigger function callable by authenticated clients';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='members')
  THEN RAISE EXCEPTION 'Members view missing'; END IF;
  RAISE NOTICE 'Free staging schema: RLS, auth trigger, roles and grants PASS';
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
-- Manager may create one project through the RLS policy.
INSERT INTO public.projects(id,title,type,department,created_by,assignee_id)
VALUES ('20000000-0000-4000-8000-000000000001','Demo AEKE video','VIDEO','VIDEO',
'10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');

SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
DO $$
BEGIN
  IF public.is_leader() THEN RAISE EXCEPTION 'Member detected as manager'; END IF;
  IF (SELECT count(*) FROM public.projects) <> 1 THEN
    RAISE EXCEPTION 'Member cannot read project'; END IF;
  BEGIN
    INSERT INTO public.projects(title,type,department,created_by)
    VALUES ('Unauthorized','VIDEO','VIDEO','10000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'Member was able to insert an assigned project';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'Free staging RLS roles: PASS';
END $$;
RESET ROLE;

-- READ ONLY. Run on the target Supabase project before applying V2 migrations.
-- Query schema/roles only: never export credentials or user rows.
SELECT current_database() AS database_name, current_schema() AS active_schema;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'projects', 'status_change_requests',
    'project_draft_reviews', 'project_logs', 'notifications')
ORDER BY table_name, ordinal_position;

SELECT t.schemaname, t.tablename,
       c.relrowsecurity AS rowsecurity,
       c.relforcerowsecurity AS forcerowsecurity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE schemaname = 'public'
  AND tablename IN ('profiles','projects','status_change_requests','project_draft_reviews');

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','projects','status_change_requests','project_draft_reviews')
ORDER BY tablename, policyname;

SELECT table_name, privilege_type, grantee
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('profiles','projects','status_change_requests','project_draft_reviews')
ORDER BY table_name, grantee, privilege_type;

SELECT conrelid::regclass AS table_name,
       conname AS constraint_name, contype AS constraint_type
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conrelid IN ('public.projects'::regclass,
                   'public.status_change_requests'::regclass)
ORDER BY conrelid, conname;

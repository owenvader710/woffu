-- Isolated Free STAGING only. Existing production publication untouched.
-- Postgres Changes is the fast path; visible-tab polling is a fallback.
DO $enable$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END
$enable$;

-- Only the owner receives notification rows. The app already applies an
-- additional active-account authorization check before reading notifications.
-- Existing RLS and GRANT SELECT TO authenticated must remain in place.

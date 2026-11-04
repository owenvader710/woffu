-- CI-only PostgreSQL schema fixture. NOT a production schema dump.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_name text
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'TODO',
  assignee_id uuid REFERENCES public.profiles(id),
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.status_change_requests (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  from_status text NOT NULL,
  to_status text NOT NULL,
  request_status text NOT NULL DEFAULT 'PENDING',
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz
);

GRANT SELECT ON public.profiles, public.projects TO authenticated;

INSERT INTO public.profiles (id, role, is_active, display_name) VALUES
  ('10000000-0000-4000-8000-000000000001', 'LEADER', true, 'Team Leader'),
  ('10000000-0000-4000-8000-000000000002', 'MEMBER', true, 'Assigned Editor'),
  ('10000000-0000-4000-8000-000000000003', 'MEMBER', true, 'Senior Reviewer'),
  ('10000000-0000-4000-8000-000000000004', 'MEMBER', true, 'Unrelated Member'),
  ('10000000-0000-4000-8000-000000000005', 'ADMIN', true, 'Administrator'),
  ('10000000-0000-4000-8000-000000000006', 'LEADER', false, 'Inactive Leader');

INSERT INTO public.projects (id, title, status, assignee_id) VALUES
  ('20000000-0000-4000-8000-000000000001', 'AEKE S1 Pro video', 'TODO', '10000000-0000-4000-8000-000000000002');

INSERT INTO public.status_change_requests
(id, project_id, requested_by, from_status, to_status) VALUES
('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'TODO', 'IN_PROGRESS'),
('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'TODO', 'COMPLETED'),
('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'IN_PROGRESS', 'BLOCKED');

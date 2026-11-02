-- Free staging ONLY. Do not deploy this bootstrap migration to production.
-- No production data or credentials are copied.
-- Tested alongside V2 approval + draft migrations on a fresh Supabase Free project.
CREATE TYPE public.role_type AS ENUM ('LEADER','MEMBER');
CREATE TYPE public.dept_type AS ENUM ('GRAPHIC','VIDEO','ALL');
CREATE TYPE public.project_type AS ENUM ('VIDEO','GRAPHIC');
CREATE TYPE public.project_status AS ENUM ('TODO','IN_PROGRESS','BLOCKED','COMPLETED','PRE_ORDER');
CREATE TYPE public.request_status AS ENUM ('PENDING','APPROVED','REJECTED');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role public.role_type NOT NULL DEFAULT 'MEMBER',
  department public.dept_type NOT NULL DEFAULT 'VIDEO',
  phone text, avatar_url text, email text, birth_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE,
  title text NOT NULL,
  type public.project_type NOT NULL,
  department public.dept_type NOT NULL,
  status public.project_status NOT NULL DEFAULT 'TODO',
  assignee_id uuid REFERENCES public.profiles(id),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  start_date timestamptz, due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  brand text, priority text, video_goal text,
  graphic_job_type text, description text, video_priority text,
  video_purpose text, graphic_category text, product_group text
);
CREATE INDEX idx_woffu_projects_assignee ON public.projects(assignee_id);
CREATE INDEX idx_woffu_projects_created ON public.projects(created_at DESC);

CREATE TABLE public.status_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES public.profiles(id),
  from_status public.project_status NOT NULL,
  to_status public.project_status NOT NULL,
  note text,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  request_status public.request_status NOT NULL DEFAULT 'PENDING',
  status text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_woffu_requests_project ON public.status_change_requests(project_id, request_status);

CREATE TABLE public.project_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL, message text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, content text,
  notice_type text NOT NULL DEFAULT 'GENERAL',
  attachment_url text, attachment_name text, attachment_kind text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, title text NOT NULL,
  message text, link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_woffu_notifications_user ON public.notifications(user_id, created_at DESC);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE, p256dh text NOT NULL, auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL, role text NOT NULL DEFAULT 'MEMBER',
  department text NOT NULL DEFAULT 'ALL',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
  used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_valid CHECK (role IN ('LEADER','MEMBER')),
  CONSTRAINT department_valid CHECK (department IN ('VIDEO','GRAPHIC','ALL'))
);

-- Account lifecycle: Supabase Auth creates a MEMBER profile after registration.
CREATE FUNCTION public.woffu_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles(id, email, display_name)
  VALUES(new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.woffu_new_user_profile();

-- Privileged lookup prevents recursive RLS when checking manager permissions.
CREATE FUNCTION public.is_leader()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'LEADER' AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_leader() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_leader() TO authenticated;

CREATE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER requests_updated_at BEFORE UPDATE ON public.status_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoker view does not bypass profiles RLS.
CREATE VIEW public.members WITH (security_invoker = true) AS
SELECT id, display_name, department, role, is_active FROM public.profiles;

-- RLS: all exposed tables are locked down from public users.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.projects, public.members,
  public.status_change_requests, public.project_logs, public.team_notices,
  public.notifications, public.push_subscriptions, public.push_tokens,
  public.invites FROM anon, authenticated;

GRANT SELECT ON public.profiles, public.members, public.projects,
  public.status_change_requests, public.project_logs, public.team_notices,
  public.notifications TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.status_change_requests, public.project_logs TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions, public.push_tokens
  TO authenticated;

CREATE POLICY profiles_team_read ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY profiles_manager_edit ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT public.is_leader())) WITH CHECK ((SELECT public.is_leader()));

CREATE POLICY projects_team_read ON public.projects FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY projects_leader_insert ON public.projects FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_leader()) AND created_by = (SELECT auth.uid()));
CREATE POLICY projects_leader_update ON public.projects FOR UPDATE TO authenticated
  USING ((SELECT public.is_leader())) WITH CHECK ((SELECT public.is_leader()));
CREATE POLICY projects_leader_delete ON public.projects FOR DELETE TO authenticated
  USING ((SELECT public.is_leader()));

CREATE POLICY requests_team_read ON public.status_change_requests
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY requests_assignee_insert ON public.status_change_requests
  FOR INSERT TO authenticated WITH CHECK (
    requested_by = (SELECT auth.uid()) AND
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.assignee_id = (SELECT auth.uid()))
  );

CREATE POLICY logs_team_read ON public.project_logs
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);
CREATE POLICY logs_own_insert ON public.project_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = (SELECT auth.uid()));

CREATE POLICY notices_team_read ON public.team_notices
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY notifications_own_read ON public.notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY push_subscriptions_own ON public.push_subscriptions
  FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY push_tokens_own ON public.push_tokens
  FOR ALL TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Use Supabase Storage free tier for optional uploads; server performs uploads.
INSERT INTO storage.buckets(id,name,public)
VALUES ('avatars','avatars',true),('team-notices','team-notices',true)
ON CONFLICT (id) DO NOTHING;

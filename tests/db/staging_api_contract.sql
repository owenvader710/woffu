-- Read-only API schema contract for WOFFU V2 Free staging.
-- LIMIT 0 validates columns and joins without reading user or project records.
BEGIN READ ONLY;

SELECT id, display_name, role, department, is_active,
       avatar_url, phone, email, birth_date
  FROM public.profiles LIMIT 0;

SELECT id, title, code, type, department, status, created_at,
       start_date, due_date, brand, video_priority, video_purpose,
       graphic_job_type, assignee_id, created_by
  FROM public.projects LIMIT 0;

SELECT id, project_id, draft_number, review_status, created_at
  FROM public.project_draft_reviews LIMIT 0;

SELECT id, project_id, request_status, created_at
  FROM public.status_change_requests LIMIT 0;

SELECT id, title, content, notice_type, is_pinned, is_active, created_at
  FROM public.team_notices LIMIT 0;

-- The dashboard's nested project relation must resolve with the current FK.
SELECT requests.id, projects.title, projects.code, projects.department
  FROM public.status_change_requests AS requests
  JOIN public.projects AS projects ON projects.id = requests.project_id
  LIMIT 0;

COMMIT;

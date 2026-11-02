# WOFFU OS V2 — Phase 3 Draft QC rollout

This phase adds **draft/review rounds** without changing the existing project
status workflow. A project can remain IN_PROGRESS while Draft 1 is SUBMITTED,
CHANGES_REQUESTED, or APPROVED. Approval of a Draft is not the same as
approving a project status change.

## Before deployment
1. Back up Supabase production. Use a separate **staging Supabase** project
   containing a copy of the schema and representative projects/accounts.
2. Apply the database migrations **in order**:
   - \`202611020001_atomic_status_approvals.sql\`
   - \`202611020002_project_draft_reviews.sql\`
3. Validate existing RLS on \`projects\` and \`profiles\`. The migration adds
   a SELECT-only RLS policy on \`project_draft_reviews\`; all mutations are via
   protected SECURITY DEFINER functions that re-check \`auth.uid()\`.
   A reviewer selected in the UI is assigned via manager-only project PATCH:
   verify that direct SQL/PostgREST writes cannot bypass project RLS.
4. Deploy V2 to staging with staging Supabase credentials.
5. Test:
   - Assigned worker submits a valid HTTPS Draft 1 link; another user cannot
     submit a Draft on their behalf.
   - Same Draft cannot be submitted twice or while a review is pending.
   - Manager can select an active reviewer other than the worker.
   - Assigned reviewer can APPROVE or REQUEST_CHANGES; unrelated MEMBER cannot.
   - REQUEST_CHANGES requires written feedback.
   - Next Draft number increments only after CHANGES_REQUESTED (up to Draft 4).
   - Approval/rejection of Draft does not mutate \`projects.status\`.
   - Concurrent decisions/submissions produce exactly one successful transition.
   - Inactive accounts are rejected.
   - My Work latest Draft chip and Dashboard QC queue match real data.
   - Notifications are best effort and do not undo successful review operations.
   - Keyboard navigation and links work on desktop and mobile.
6. Only after successful staging tests and backup should you deploy the SQL
   migration to production, followed by the V2 app.

## Operational notes
- Each Draft has one immutable submitted link and one decision; revision
  becomes a **new Draft** rather than overwriting the old one.
- Senior reviewers are assigned in Project Detail. Existing role model is
  ADMIN / LEADER / MEMBER. A senior can remain MEMBER but is allowed to
  review only when assigned as project reviewer. Leaders/admins may review.
- If the SQL migration is missing, the Draft Review panel explicitly reports
  this and disallows submission/review; existing My Work listings stay usable.
- This commit does not run database migrations, send production notifications,
  or change the live application.
- The Dashboard's QC and deadline previews are not a replacement for full
  operational monitoring; pending work may exceed the number shown.

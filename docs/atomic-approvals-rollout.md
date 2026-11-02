# WOFFU OS V2 — Atomic approvals rollout

## Why this migration is needed
The legacy application updates \`status_change_requests\` and \`projects\` in
separate API calls. If one succeeds and the other fails, the approval history
and actual project status diverge. V2 uses a single PostgreSQL function with
row locks; any SQL error rolls back both writes.

## Safe rollout (do not apply directly to production)

1. **Backup** the existing Supabase database (schema and data).
2. Create a separate **staging Supabase project** and restore representative
   data. Verify that \`public.profiles\`, \`public.projects\`, and
   \`public.status_change_requests\` exist and their column types match.
3. Review and execute \`supabase/migrations/202611020001_atomic_status_approvals.sql\`
   on staging. Check that no existing function with that name has incompatible
   signatures and that \`status\` and \`request_status\` accept the existing values.
4. Configure staging environment variables; deploy the V2 branch to staging.
5. Test:
   - An anonymous user and a MEMBER cannot approve/reject.
   - Active LEADER and ADMIN can approve exactly once.
   - Approving updates both the request and project status.
   - Two concurrent approvals allow only one success.
   - A stale request cannot override the current project status.
   - Reject requires a reason and does **not** modify the project status.
   - The UI refreshes and shows the Reject reason.
   - In-app notifications are best-effort; notification failures must not roll
     back an already-successful approval.
6. After sign-off, apply the **same reviewed migration** to production, then
   deploy V2. Do not deploy the new approval API before migration.

## Operational notes

- Function runs as \`SECURITY DEFINER\` and checks \`auth.uid()\` against
  active LEADER/ADMIN profiles. EXECUTE is granted only to \`authenticated\`.
- A service role key must never be made available to browser code.
- Keep the PR in Draft until migrations, RLS review and live smoke tests pass.
- No production data or secrets are changed by committing the SQL file.
- Rollback: roll back the V2 application deployment. Do **not** drop the new
  columns or the function while any instance is still calling it.

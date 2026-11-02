# WOFFU OS V2 — Staging isolation and verification

## Current verified state (2026-11-02)

- GitHub PR #1 contains the reviewed V2 branch.
- Vercel Preview deployments are created automatically for that branch.
- Vercel currently lists the same Supabase environment-variable records with targets
  `production`, `preview`, and `development`. That does **not** establish an
  independent staging Supabase database.
- The V2 Preview defaults to **read-only API mutations** (HTTP 423) until
  `WOFFU_ENABLE_PREVIEW_MUTATIONS=true` is deliberately configured.
- This API guard is **not** a database firewall: direct calls from a browser
  to Supabase bypass Next.js API middleware. **Never test writes until Vercel
  Preview uses a distinct Supabase project.**
- PostgreSQL migration integration tests run against an isolated CI fixture.
  Passing those tests does not validate the live Supabase schema or RLS.

## Create an independent staging environment

1. In Supabase, create a **separate project** called e.g. `woffu-staging`.
   Never reuse the production DB/project or production auth accounts.
2. Review the production schema *without mutation* using
   `tests/db/audit-readonly.sql`, check foreign keys, status types, tables,
   policies, and schema drift before migrations.
3. Back up production. Rebuild the needed schema and a **sanitized** set of
   test records in staging. Do not copy real passwords or unnecessary client
   data; use independent test identities.
4. Apply SQL migrations **in order on staging only**:
   - `supabase/migrations/202611020001_atomic_status_approvals.sql`
   - `supabase/migrations/202611020002_project_draft_reviews.sql`
5. In Vercel project `woffu` → Settings → Environment Variables, set
   distinct **Preview** values (ideally branch-scoped to
   `v2/stability-hardening-20261102`) for:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL of staging Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: staging publishable/anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: staging-only server key, never public
   - `NEXT_PUBLIC_SITE_URL`: Preview deployment origin
   - Any push/email/FCM credentials: dedicated non-production credentials or
     disable notification sending during tests
6. Remove Preview scope from **production** Supabase variables. Verify that
   Preview and Production have different Supabase project references by
   comparing metadata, **without printing or sharing key values**.
7. Review the PR commit and restrict preview access to trusted team members.
   Do not expose service-role credentials to unreviewed fork builds.
8. After an independent staging DB is confirmed, explicitly set
   `WOFFU_ENABLE_PREVIEW_MUTATIONS=true` for the trusted V2 Preview branch
   only and redeploy. The guard intentionally refuses writes before that.
9. Sign into the Preview with **test accounts** that exist only on staging.

## Acceptance workflow (staging accounts)

| Step | Actor | Action | Expected result |
| --- | --- | --- | --- |
| 1 | LEADER | Create/assign VIDEO job | Project created in staging, assigned worker notified |
| 2 | MEMBER (assignee) | Start the job | Status request recorded; unassigned member denied |
| 3 | LEADER | Approve status change | Request + project updated in one transaction |
| 4 | MEMBER (assignee) | Submit Draft 1 HTTPS link | Draft 1 visible, project still IN_PROGRESS |
| 5 | Senior MEMBER (selected reviewer) | Request changes with feedback | Revision feedback saved, worker can submit Draft 2 |
| 6 | MEMBER (assignee) | Submit Draft 2 | Historical Draft 1 unchanged |
| 7 | Senior MEMBER | Approve Draft 2 | Draft marked APPROVED, project status unchanged |
| 8 | MEMBER | Request COMPLETED status | Approval is required; cannot mutate project status directly |
| 9 | LEADER | Approve completion | Project state and request agree |
| 10 | ADMIN / unrelated MEMBER | View and act | Admin allowed; unrelated user blocked |

Also check duplicate submit/review (409), stale project status (409), wrong
roles (403), unauthenticated API calls (401), notification failures, long Thai
titles, mobile 390px and desktop 1440px, keyboard navigation, and timezone
Asia/Bangkok.

## Release gate

- CI TypeScript + production build green.
- Isolated SQL migration integration green.
- No unresolved critical security issue; audit dependencies and RLS.
- Staging branch test records verified with independent Supabase project.
- Production backup and a reviewed migration plan.
- **Migrate production DB first, then deploy V2** after approval.
- Do not merge PR #1 before the above checks pass.

# WOFFU OS V2 — Release acceptance & rollback checklist

Date: 2026-11-04. Scope: **staging only** (`xofndnlyqueyuqyweqyi`; `https://woffu-v2-staging.netlify.app`). Never copy staging test users or passwords into production.

## Verified acceptance results
- Latest checked commit before this document: `fb290de4c2719ac51bea8af4a0750cc2c65c45ad`. Both `WOFFU OS CI` and `WOFFU DB Migration Tests` succeeded.
- Human browser test of `/release-check` with active MEMBER: **3 / 3 PASS**. GET `/api/approvals`, POST `/api/projects`, and POST `/api/invites` all returned **HTTP 403**. Test uses invalid empty POST bodies and writes no records.
- Supabase staging migrations include `prevent_skipping_in_progress`, `restrict_direct_completion_requests` and `invitation_display_names`.
- Staging named invitation was redeemed and matching active user profile created.
- Password recovery was completed by a real user on staging.
- Supabase RLS and privileged RPC checks are documented in `docs/V2_STAGING_SECURITY_ACCEPTANCE_2026-11-04.md`.
- Known remaining Advisor warnings: 5 intentionally authenticated-executable SECURITY DEFINER helpers/RPCs with per-caller checks; leaked-password protection is a Supabase Pro+ feature unavailable on Free.

## Current read-only staging inventory at verification
- profiles 3; projects 2; project_draft_reviews 4; status_change_requests 4; team_notices 0; invites 2. These **counts are not a database backup**.
- Project `main` and production Supabase project `egxhmruqubaxuyxefwqa` have not been modified as part of V2 staging acceptance.

## Production release blockers
- [ ] **Backup production independently, securely and verify restoration**. Export the production PostgreSQL schema/data and separately preserve Supabase Auth users, Storage object inventory/files, relevant Netlify environment configuration and secrets through supported secure admin processes. Encrypt and store access-restricted backups; do not place dumps, credentials, emails, invite tokens or user data in GitHub/chat. A Supabase SQL table count is **not** an export or recovery plan. Determine the Free tier's available backup method first.
- [ ] Check production schema/data compatibility and plan **forward migration** from the production baseline; do not replay Free staging bootstrap scripts on populated production.
- [ ] Confirm whether existing production users, password hashes, storage attachments and historical workflows need migration. Establish a tested rollback/restore plan and acceptable downtime with the owner.
- [ ] Freeze a reviewed GitHub release commit; confirm corresponding Netlify deployment, production and staging Supabase project IDs and all environment URLs/secrets. Do not connect V2 staging Netlify to production credentials inadvertently.
- [ ] Obtain owner authorization for production cutover. No automatic merge to `main`, production migration, DNS change or production environment edit.
- [ ] After cutover: run smoke tests of auth, team invites, permissions, projects, Draft reviews, approvals, notifications, uploads, password reset; confirm production is not flagged as staging and review logs/alerts.

## Rollback if cutover fails
1. Stop new writes or put the affected production deployment into maintenance/read-only mode to prevent divergence.
2. Repoint production routing to the previously verified application deployment; this **does not reverse database migrations**.
3. Restore the verified database/Auth/Storage backup **only after** identifying whether post-cutover production writes must be preserved. Recover from an isolated copy first, validate records, and only then restore to the production system following an approved recovery procedure.
4. Verify account login, profile roles, project counts/relationships and attachments; record incident details before reopening writes.

## Last external check
The operator confirmed the staging permission test screenshot showed 3/3 expected HTTP 403 responses. A separate automated external verification of Netlify's deployed commit has not been completed; verify deployment SHA through Netlify before promoting.

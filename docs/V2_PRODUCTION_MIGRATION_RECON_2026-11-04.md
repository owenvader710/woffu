# WOFFU OS V2 — Production migration reconnaissance (READ ONLY)

Date: 2026-11-04. **No production writes, deployments or database exports were performed.**

## Project identities
- Current production Supabase: `egxhmruqubaxuyxefwqa`
- V2 staging Supabase: `xofndnlyqueyuqyweqyi`
- Reviewed V2 GitHub branch: `v2/stability-hardening-20261102`
- Production `main` must remain untouched until an explicitly approved cutover.

## Actual database differences found
| Table | Production | V2 Staging | Migration need |
| --- | --- | --- | --- |
| public base tables | 9 | 10 | Add project_draft_reviews without removing existing tables |
| tables with RLS enabled | 5 of 9 | 10 of 10 | Review RLS policies and privileges before enabling on four legacy tables |
| projects columns | 21 | 22 | Add reviewer_id uuid (with reviewed FK/RLS, not ad-hoc assignment) |
| status_change_requests columns | 12 | 15 | Add reject_reason, rejected_by and rejected_at through validated migration |
| invites columns | 9 | 10 | Add display_name (nullable for historical rows) |
| project_draft_reviews | absent | 11 columns | Create table, indexes, policies and workflow RPC as migration |

Present in production but RLS off: `invites`, `push_subscriptions`, `push_tokens`, `team_notices`. Current V2 security tightening enables RLS for all. **Do not turn on RLS in production independently of matching policies** or live users may lose access.

## Production inventory (read-only, pre-backup)
- profiles **7**
- projects **7**
- status_change_requests **12**
- invites **2**
- team_notices **10**

These figures are point-in-time observation, **not** an export, backup or integrity guarantee.

## Free-plan backup method
Supabase official [Database Backups documentation](https://supabase.com/docs/guides/platform/backups) states automated daily backups are for Pro/Team/Enterprise projects and recommends **Supabase CLI `db dump`** plus off-site backups for Free plans.

Owner/operator must:
1. Obtain a connection string for the **production project only** from the Supabase Dashboard > Connect (do not paste credentials into chat or GitHub). Install Supabase CLI and verify exact available syntax with `supabase db dump --help`.
2. Create secure local/off-site **role, schema and data exports** using the documented CLI options, protecting files with encryption and access control. The database dump and Supabase Auth schema require explicit attention to Auth user restoration; verify the backup includes all required objects and data for the chosen recovery method.
3. Back up **Storage objects/files separately**, since PostgreSQL metadata alone cannot restore file contents. Inventory Auth configuration, SMTP, redirects, third-party keys and Netlify environment settings separately without writing secrets into the repository.
4. Restore a copy in an isolated database and verify row counts, constraints, login strategy and Storage files. A backup without a restore test is not enough for production cutover.

## Migration strategy (not yet applied)
1. Freeze writes / schedule a cutover window only after backup and restore rehearsal.
2. Create an isolated **production-shaped** database from the verified production backup, not from the empty staging baseline.
3. Apply forward-only additive V2 migrations in dependency order (Draft QC, RLS helpers, workflow guardrails, status transition constraints, invitation display_name), reconciling existing production enum values, triggers, indexes, policies and legacy columns.
4. Validate all seven production profiles, seven projects, 12 status requests, 10 team notices and the rest of the production data without leaking personal information.
5. Exercise leader/member role boundaries, new and historical approvals, Draft QC, invite acceptance and account recovery on the isolated migrated copy.
6. Explicitly authorize production migration and application promotion; separately verify deployment runtime points to the intended database before reopening writes.
7. Maintain previous app deployment + independently verified database/Auth/Storage restore plan; rolling back a web deploy **does not** roll back a database migration.

## Release gate decision
**Not approved for automatic production cutover.** Verified schema differences and real production records require a backup/restore rehearsal and production-shaped migration integration test first. No change to current production has been made.

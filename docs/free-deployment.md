# WOFFU OS V2 — $0 Deployment Guide (for a small team)

This setup intentionally **does not use Supabase paid branches** or Vercel
Hobby for commercial production use.

## Accounts and ongoing cost

| Service | Plan | Purpose | Limit |
|---|---|---|---|
| Supabase | Free ($0) | Postgres, Auth, Storage, API | 2 active projects; 500 MB database per project; 1 GB storage; may pause after inactivity |
| Netlify | Free ($0) | Host full-stack Next.js App Router | 300 credits/month hard cap; site pauses when exhausted |
| GitHub | Free | Repository and CI | Actions minutes/storage subject to quotas |
| Email | **Optional** | Invite members | No provider needed — copy one-time invite link |
| Browser push | Optional | Notifications | In-app notifications still work without push/FCM |
| Domain | Optional | Address | Use the included `*.netlify.app` URL for $0 |

Netlify publicly states that its Free plan can serve commercial projects.
It has a hard cap instead of overage charges. Avoid unnecessary CI redeploys and
frequent rebuilds to conserve monthly credits.

## Step 1 — Supabase, already provisioned

The separate project `woffu-v2-staging-free` is on the existing **Free**
organization. Its reference is `xofndnlyqueyuqyweqyi`.
Migrations applied there:
1. `free_staging_baseline` (mirrors the essential project schema, with RLS)
2. `atomic_status_approvals_v2`
3. `project_draft_reviews_v2`

**The original Supabase project is unchanged.**
No production accounts, work records or secrets have been copied.

For initial access: create one **staging-only Auth user** in the new Supabase
project (Dashboard → Authentication → Users → Add user), and change that
user's role to LEADER via a reviewed one-time SQL operation. Do not enable
a public first-admin signup endpoint or use a password known to third parties.
After that, the leader invites all other users by sharing a one-time link.

## Step 2 — Set up Netlify Free

1. On Netlify, create a **Free** account/site and connect the existing
   GitHub repository `owenvader710/woffu`.
2. Choose branch `v2/stability-hardening-20261102` for **staging only**.
   The repository has a `netlify.toml` build config; the Next.js OpenNext
   runtime is auto-detected. Do not pin an older adapter.
3. Under Netlify → Project configuration → Environment variables, configure:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://xofndnlyqueyuqyweqyi.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon key from **staging**
   - `SUPABASE_SERVICE_ROLE_KEY` = server-only secret from **staging**
   - `NEXT_PUBLIC_SITE_URL` = actual staging Netlify origin
   - `WOFFU_DEPLOYMENT_MODE` = `staging` (required for the test site)
   - `WOFFU_ENABLE_PREVIEW_MUTATIONS` = `true` **only after verifying staging keys**
4. Never put the service-role key under any `NEXT_PUBLIC_` variable.
5. Keep email provider variables empty to use free manually shared invite
   links. Optional web push can be configured later with VAPID keys.
6. In Supabase Auth URL configuration, add the **staging Netlify URL**
   and invite callback URL. Keep Production project settings unchanged.
7. Login as your new staging LEADER. Create an internal test project, invite
   a test MEMBER, and run the acceptance checklist in
   `docs/staging-isolation-and-smoke-tests.md`.

**Important:** The old Vercel Preview might still point to the original
Supabase project. Do NOT enable writes there or use it for staging work.
Use the Netlify site whose env values you have checked instead.

## Step 3 — Optional production rollout after tests

Production needs its **own reviewed migration and backup**. Do not apply
`supabase/staging/free_baseline.sql` to the existing production database;
it is intended only for an empty standalone staging project.

Do not claim a team production release is complete before verifying the live
website, login, project flow, RLS, storage and quotas. The Free offerings
have no production uptime SLA, and can pause on inactivity/usage limits.

## Reference documentation

- Supabase pricing: https://supabase.com/pricing
- Netlify pricing: https://www.netlify.com/pricing/
- Netlify Next.js: https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- Netlify Free & commercial projects: https://www.netlify.com/blog/introducing-netlify-free-plan/
- Vercel Hobby terms (personal/noncommercial): https://vercel.com/legal/terms

## November 2 staging integration verification

A real **rollback-only SQL smoke test** was run against the isolated free
staging Supabase database (no actual user credentials or production data).
Temporary Auth rows and a project were created inside a transaction, and
all test records were rolled back. Verified: leader atomic status approval,
worker Draft 1 submission, unrelated MEMBER denied access to QC records,
assigned reviewer REQUEST_CHANGES, then worker Draft 2 submission.
After rollback there were **zero Auth users and zero projects**.

During this test we caught and fixed a PostgreSQL enum incompatibility:
`woffu_submit_project_draft` compared `project_status` against unsupported
`CANCELLED`, causing 22P02 failures. Fixed both the fresh Phase 3 migration
and added a forward migration (`202611020003_fix_draft_closed_status.sql`),
which has been applied **to staging only**. CI now tests the actual enum.

**Free-tier optimization:** My Work background polling now occurs every
2 minutes when the browser tab is visible; it refreshes on tab return.
This reduces Netlify request/compute consumption for idle team members.

**Not yet verified:** browser login or application HTTP workflows. The
staging Auth user list is empty and Netlify has not been connected/deployed.


## Latest security & small-file compatibility checks

The standalone Free Supabase staging DB has additional **staging-only**
hardening changes:
- `free_active_member_rls.sql`: suspended users have no direct Data API
  access to projects, profiles, notices, requests or notifications, even
  with an otherwise valid Supabase Auth token.
- `free_public_attachments.sql`: creates missing `project-files` bucket,
  restricts project/notice uploads to 5 MB JPG/PNG/WebP/PDF and avatars
  to 2 MB images. Both the API and Storage limits reject other types.
- The invitation endpoint atomically claims unused tokens before creating
  an Auth account, so a link cannot register two people concurrently.
  If Auth creation fails, the claim is released for retry.
- Login rejects disabled profiles and signs out the failed session.
- PostgreSQL 17 CI covers disabled-account access, one-time claims, new
  bucket constraints and all Draft/Approval migrations.

**Privacy reminder:** project-files and team-notices use public Storage
links for small presentation attachments. Do not upload private customer
footage, contracts or confidential project sources there. Prefer restricted
Google Drive access links for those files.

**Deployment still pending:** No Netlify project has been connected and
no staging user credentials have been created. Never point the preview at
the original production Supabase project.


## Password recovery (new in V2)

The login screen now includes a Thai **ลืมรหัสผ่าน?** link,
a recovery request page, token/code callback and new-password form.
See `docs/password-recovery-setup.md` for the exact Supabase Auth
redirect allowlist and email-template configuration required after the
Netlify site has a real HTTPS address.

**Free-tier caveat:** Supabase's included test SMTP only sends Auth
emails to organization-authorized addresses, with strict rate limits.
Manual one-time invitation links remain free, but automatic reset email
delivery to all staff **cannot be guaranteed** until a suitable SMTP
provider is configured. Do not advertise email recovery as fully
operational before testing it with normal team accounts on staging.

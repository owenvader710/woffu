# WOFFU OS V2 — Release readiness | 2026-11-03

**Verdict: NOT READY FOR PRODUCTION.** The V2 feature branch is implemented
and continuously tested, but a no-cost commercial hosting environment is
not yet connected to the isolated Supabase Staging project. No complete
browser E2E with authenticated users has been executed. Production data and
the GitHub main branch are intentionally untouched.

## Implemented on the Draft V2 branch

| Module | Code and automated tests | Browser on isolated staging |
| --- | --- | --- |
| Login, invitation, account recovery | Build and security checks | Pending |
| Profiles and manager/member permissions | RLS + database integration | Pending |
| Project assignment, My Work, deadline status | API, Build and SQL contracts | Pending |
| Atomic status approvals/rejection | Transactional SQL and role tests | Pending |
| Draft 1–4 submission/reviewer QC | SQL workflow test + alerts | Pending |
| Action Center and Dashboard | Unit tests + Next.js production build | Pending |
| In-app Notifications/Realtime | Staging publication + owner-only SQL | Pending |
| Optional Web Push/FCM | Server code, RLS ownership tests | Pending |
| Small-file attachments | Staging buckets and MIME/size test | Pending |
| Preview/Production isolation | Unit tests and actual Next.js HTTP smoke | Pending |

**Latest fixes:** Legacy status-request route delegates to the secure
V2 endpoint; old My Work direct PATCH retired (HTTP 410), since current UI
uses the canonical status-request flow. Manager approval-count endpoints
share authorization and use bounded database count queries. Failed
activity-log inserts after an accepted request no longer misreport the
request as failed. Assignment-acknowledgement retries do not send repeated
manager notifications. Invitation form stays visible after a recoverable
validation error and uses 10–128-character passwords.

## Verified safety architecture

- **Supabase staging reference:** `xofndnlyqueyuqyweqyi`.
- Preview/Netlify staging detection validates the *exact* Supabase project URL;
  a write override alone cannot use a production database.
- Real staging queries/RLS tests used rollback-only temporary accounts;
  authorization and draft workflow tests left no test users behind.
- Status approvals and Draft QC use DB functions, not two independent writes.
- In-app notifications use per-user RLS; private Push endpoints and FCM
  token ownership are protected. Browser Push is optional.
- GitHub Node 24 CI: TypeScript, Next.js Build, targeted new-module lint,
  security tests, PostgreSQL 16+17 integration, and Preview HTTP smoke.
- Existing ESLint baseline is reported separately, currently nonblocking.

## BLOCKING release gates

- [ ] **Host:** Connect a real Netlify Free website (commercial use permitted
      within its free quota) to the GitHub V2 branch. Netlify plugin/credentials
      are not linked to this ChatGPT environment, so the deployment could not
      be created here.
- [ ] **Isolation:** Configure **staging-only** Supabase URL, publishable/anon
      key and server-only Service Role Key through Netlify Settings → Environment
      Variables. Do not paste secrets in a chat or Git repository. Set
      `WOFFU_DEPLOYMENT_MODE=staging`. Confirm `/api/runtime-mode` reports
      `stagingConnected=true`, `blockedDatabase=false`.
- [ ] **Staging writes:** Only after verifying credentials, set
      `WOFFU_ENABLE_PREVIEW_MUTATIONS=true` for the staging host. Keep the
      original Vercel Preview production-linked environment **blocked**.
- [ ] **Auth:** Set Supabase staging Site URL and exact redirect allowlist
      `https://<staging-domain>/auth/confirm`. Test both manual manager-assisted
      recovery and automatic recovery (requires working SMTP).
- [ ] **Accounts:** Create test LEADER, video MEMBER and QC reviewer in
      isolated Staging. No real staff accounts or customer files required.
- [ ] **Workflow:** Invite → Login → Create/Assign → My Work → Status Request
      → Leader Approve/Reject → Draft 1 → QC Request Changes → Draft 2 →
      QC Approve → Final. Verify notification recipients and deep links.
- [ ] **Push:** Test optional VAPID Web Push only if real keys and browser
      notification permission are configured. Push should never block the
      underlying workflow if absent.
- [ ] **Security & performance:** Audit release dependencies and legacy
      lint, verify 390px mobile layouts, keyboard navigation, sign-out,
      expired invites, expired recovery links, no cross-user reads, and
      background-tab quota consumption.
- [ ] **Production migration & backup:** After user approves a release,
      backup the current production database; review the migration order and
      compatibility on a restored copy; plan rollback and communicate to
      affected staff. Never apply the fresh-free-staging baseline to existing
      production data.
- [ ] **Merge/deploy:** Require a reviewed PR and green checks on the final
      commit; only then merge and publish Production.

## Known unresolved release risks

1. **Dependency vulnerabilities:** production dependency audit has previously
   reported **32 advisories including 3 critical and 12 high**. CI now reports
   current packages/fixability. Do not treat the green Build as a security
   clearance; triage and remediate before business production rollout.
2. **Legacy lint:** the baseline whole-project report is nonblocking; targeted
   security/feature modules are enforced. Full lint remediation remains.
3. **Email delivery:** Supabase's test SMTP has recipient/rate restrictions.
   The manager-assisted one-time recovery link does not require SMTP,
   but needs manual identity verification and an authenticated manager.
4. **Hosting quotas:** Free-tier sites and databases have limits. Monitor
   storage and build/compute consumption to avoid interruptions.
5. **No real browser E2E:** a successful build, SQL fixture test or
   READY Vercel Preview does not prove full user workflows.

## Operational links

- Draft PR: https://github.com/owenvader710/woffu/pull/1
- Free hosting: `docs/free-deployment.md`
- Password recovery: `docs/password-recovery-setup.md`
- Notifications: `docs/notification-center.md`
- Action Center: `docs/action-center.md`
- Supabase isolation: `docs/staging-isolation-and-smoke-tests.md`

The project should remain a **Draft Pull Request** until all blocking
gates are checked with evidence. No background work or automatic
production deployment has been scheduled.

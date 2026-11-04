# WOFFU OS V2 — Staging security acceptance review (2026-11-04)

**Scope:** V2 staging Supabase `xofndnlyqueyuqyweqyi` and branch `v2/stability-hardening-20261102`. The existing production Supabase project and `main` have not been modified during this review.

## Verified
- GitHub WOFFU OS CI and WOFFU DB Migration Tests both passed at commit `32d9e3174ab3d79ace83e2fe6f87c92c2edd7e85`.
- All 10 `public` base tables have RLS enabled. `anon` has no table SELECT privileges; `invites` is not SELECTable by `authenticated`.
- All five SECURITY DEFINER helpers/RPCs flagged by Supabase Security Advisor are not executable by `anon`; `authenticated` has EXECUTE by design, with user/profile/role checks inside the functions.
- SQL impersonation of an active MEMBER returned `FORBIDDEN` for `woffu_process_status_approval`; `is_leader()` returned false.
- SQL impersonation of an unrecognized authenticated UUID returned false for active-member and leader helpers, `FORBIDDEN` for approval, and zero visible projects.
- Workflow, invitation display names, password recovery and named invite acceptance have been tested on staging. SQL tests of recent migrations, member RPC authorization and invitation persistence now run in CI.

## Advisor warnings and disposition
1. **Authenticated users can execute five SECURITY DEFINER functions (WARN):** retained intentionally for RLS helper lookups and atomic workflow RPCs. The functions validate `auth.uid()`, active team membership, and manager/assignee/reviewer relationship as appropriate. This is not proof of a vulnerability-free implementation; keep testing authorization whenever these functions change. Do not revoke EXECUTE from `authenticated` without changing the API/RLS architecture.
2. **Leaked password protection disabled (WARN):** Supabase documents HaveIBeenPwned-based password checks as **Pro Plan and above**. This warning is a Free-tier limitation, not a blocker for internal staging use. Existing app password flows require 10–128 chars. Favor a unique password manager-generated password; do not advertise leaked-password screening on Free.

Docs: https://supabase.com/docs/guides/auth/password-security

## Remaining release conditions
- Confirm staging Netlify deployment for the latest reviewed commit and recheck `/api/runtime-mode`.
- Perform one final authenticated browser-level negative test using MEMBER against leader-only API routes (SQL/RLS tests are not a substitute for an HTTP E2E test).
- Capture recovery plan, environment separation, and backup before any production migration; no automatic production promotion.
- Recheck Security Advisor and GitHub checks before an actual production rollout.

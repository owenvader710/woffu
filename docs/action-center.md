# WOFFU OS V2 — Action Center

A single actionable checklist for Video and Graphic team roles.

## Where

- Main navigation: **ต้องดำเนินการ** → `/action-center`
- Dashboard priority cards link to Action Center.
- Read-only endpoint: `GET /api/action-center`
- No paid services, background worker, cron, or new database migrations.

## What is shown

| Category | LEADER | MEMBER |
| --- | --- | --- |
| Overdue / Due soon | All open projects | Their own assigned projects |
| Blocked | All open blocked projects | Their own blocked projects |
| Draft awaiting QC | All submitted latest Drafts | Only those they are assigned to review |
| Changes requested | All latest Draft revisions to follow up | Only their own submissions |
| Status change approvals | Pending requests for open projects | Not displayed |

A reviewer who did not submit a Draft may review it. Assigned workers do
**not** see their own submitted Draft as a QC task. An old Draft 1 revision
is never marked active after Draft 2 has been sent. The **latest
draft_number**, not latest wall-clock timestamp, identifies the current QC
status.

Blocked tasks are not duplicated as overdue items. Other categories are
independent, so a Draft awaiting QC can also have an overdue deadline.

Deadline calculations use the stored UTC instant and a rolling **72-hour**
window. The UI displays dates in the `Asia/Bangkok` timezone.

## Security and scalability

- Uses the existing active-member authorization and Supabase RLS.
- MEMBER queries are scoped to `assignee_id` or `reviewer_id`; only the
  assigned worker gets due-date action items.
- Only managers query pending status approvals.
- The API never writes data; task actions open the existing protected
  Project Draft Review and Approvals pages.
- At most **500 open projects** and **500 pending approvals** are fetched.
  Review batches contain up to 80 projects × 4 Drafts. The interface warns
  when it reaches the capped data boundary; displayed counts are from the
  loaded queue, not an unbounded organization-wide estimate.
- Browser refresh is manual on this page to reduce free hosting usage;
  requests are `no-store`.
- Staging/preview isolation stays enforced by the shared deployment guard.

## Validation

GitHub Actions runs:
- `tests/action-center/actionCenter.test.mjs`: worker/reviewer/leader
  visibility, newest Draft precedence, deadlines, blocked precedence and
  duplicate approval protection.
- Existing database migration integration tests and TypeScript/Next.js build.

Before production, test with at least one LEADER, one editor and one
reviewer on the **isolated Supabase staging website** (not a Preview linked
to Production). Validate long Thai titles, 390px mobile width and keyboard
navigation. No production data has been modified for this feature.

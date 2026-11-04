# WOFFU OS V2 — Notifications and Push (Free Tier)

## User flow

1. The app persists in-app notifications in `public.notifications`.
2. Draft submission alerts its assigned reviewer. When no Senior reviewer
   is assigned, it alerts all active LEADER accounts instead.
3. Approve / Request Changes notifies the worker who submitted the Draft.
4. Status-change requests notify LEADERS; approval/rejection notifies the worker.
5. Browser notification bell receives updates through Supabase Realtime
   `postgres_changes` and falls back to a **60-second refresh only while
   the tab is visible**, plus immediate refresh on tab return.
6. Optional Web Push uses VAPID and the browser subscription in
   `public.push_subscriptions`. V2 uses **only VAPID Web Push**; the obsolete
   Firebase client bootstrap and SDKs are removed.

## Security and privacy

- Notification list, unread count and read operations run as the authenticated
  **active user**, with RLS restricting access to `user_id = auth.uid()`.
  These routes no longer use the privileged service-role client.
- Web Push registration and removal use the caller's RLS-scoped client.
  An endpoint owned by another account cannot be reassigned.
- Push subscriptions and keys are **never logged**. Do not expose
  `VAPID_PRIVATE_KEY` or any Supabase service-role secret in
  `NEXT_PUBLIC_` variables. Only the VAPID **public** key may be public.
- Push deep links are limited to same-origin application paths in API,
  React notification links and `/sw.js`. V2 no longer imports any remote
  Firebase script into the service worker.
- In-app persistence is independent of Push delivery: missing VAPID settings
  don't cause a completed Draft or approval to fail.
- NotificationCenter is mounted once across desktop and mobile, eliminating
  duplicate Realtime connections and fallback polling. Browser permission is
  requested **only after the user opts in**, never at sign-in.
- The popup does not claim a notification was marked as read when the
  server rejects the request.

## Free-tier setup

Supabase Staging project: `xofndnlyqueyuqyweqyi`.

The file `supabase/staging/free_notifications_realtime.sql` is applied to
**staging only**. It adds `public.notifications` to the
`supabase_realtime` publication, leaving existing RLS intact.
Production database and publication were not modified.

For optional browser Push on a correctly isolated staging host:

1. Generate a VAPID keypair locally using the installed `web-push`
   package: `npx web-push generate-vapid-keys`. Keep the private key secret.
2. In **staging hosting environment variables** set
   `NEXT_PUBLIC_VAPID_PUBLIC_KEY` to the public key and
   `VAPID_PRIVATE_KEY` to the private key.
3. Set `VAPID_SUBJECT=mailto:<your-team-support-email>` to a genuine
   administrator contact (not a placeholder).
4. The Notification Center's **เปิด push** button subscribes a device
   using the existing `/sw.js` service worker. Ensure HTTPS and explicitly
   allow browser notification permission when prompted.
5. Legacy FCM registration APIs now respond with **HTTP 410**. Users of
   earlier FCM notifications must opt in again using the VAPID button; V1
   Production was not modified.
6. Run manual browser checks with test accounts. Disable notifications,
   sign out, change browsers and verify no other user's messages appear.

No scheduled worker, paid SMS/email gateway or new recurring charge is
required for **in-app** notifications. Browser Push availability depends
on device/OS browser permissions and configured keys. Supabase Realtime
and serverless functions still consume Free Tier quotas.

## Verified on staging

- `supabase_realtime` publication includes `public.notifications`.
- Rollback-only SQL tests confirmed that one test account cannot read or
  mark another account's notifications as read.
- Rollback-only SQL tests confirmed a foreign Web Push subscription
  endpoint cannot be taken over by a second account.
- Tests left **zero** temporary users/subscriptions in staging.
- PostgreSQL CI also runs `tests/db/notification_security.sql`.
- Node CI runs `tests/security/notificationPush.test.mjs`, asserting both
  the server and service worker reject cross-origin Push links.

## Remaining release tests

- [ ] Deploy V2 on an isolated staging host with staging-only Auth keys.
- [ ] Two real browser accounts: editor submits Draft, reviewer receives it,
      manager fallback receives it when no Senior is assigned.
- [ ] Reviewer requests changes; editor receives feedback; approval/reject
      notifications have the correct recipients, text and deep links.
- [ ] Realtime appears promptly; visible-tab polling recovers missed events.
- [ ] Browser Push delivered while app tab is closed (requires VAPID setup).
- [ ] Verify opt-out / expired subscriptions, mobile UI, keyboard access,
      permission denial, and Free Tier consumption.

The old Vercel Preview that may share Production environment variables
is intentionally read-only/blocked by the staging safety gate.

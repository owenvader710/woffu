# WOFFU OS V2 — Forgot password (Supabase Auth)

Implemented on the V2 development branch without new databases, paid packages
or third-party authentication dependencies.

## User journey

1. Login → **ลืมรหัสผ่าน?**
2. Enter the existing account's email.
3. Receive a generic confirmation (avoid leaking which accounts are registered).
4. Open the one-time recovery email link.
5. `/auth/confirm` verifies the Supabase recovery token or exchanges a PKCE
   code and writes the recovery session to secure SSR cookies.
6. `/reset-password` checks the session, requires a new 10–128-character
   password with matching confirmation, then updates Supabase Auth password.
7. The application signs out the recovery session, and the user signs in again.

Pages:
- `/login`
- `/forgot-password`
- `/auth/confirm` (callback)
- `/reset-password`

Endpoints:
- `POST /api/auth/forgot-password`
- `GET /api/auth/reset-password`
- `POST /api/auth/reset-password`

The route `/auth/confirm` does not honor arbitrary `next` or
`redirect_to` values, avoiding open redirects. Preview mutations are still
blocked on an unverified Vercel Preview. Recovery routes and existing
one-time invitations are publicly navigable without a preexisting login.

## Required Supabase Dashboard settings before email end-to-end tests

Use the **staging Supabase project only** while developing.

1. Deploy a trusted staging site on Netlify with correct, separate Supabase
   environment variables.
2. Open **Supabase Dashboard → Authentication → URL Configuration**.
3. Set the **Site URL** to the staging website's HTTPS origin.
4. Add exact redirect URL:
   `https://YOUR-STAGING-SITE.netlify.app/auth/confirm`
   (optional for local dev: `http://localhost:3000/auth/confirm`).
   Avoid broad redirect wildcards for production.
5. **Recommended for opening the email in another device/browser:**
   Under **Authentication → Email Templates → Reset Password**, use this
   recovery link (the `RedirectTo` already includes `/auth/confirm`):

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">
     ตั้งรหัสผ่าน WOFFU OS ใหม่
   </a>
   ```

   This uses a single-use recovery token that the server verifies using
   `verifyOtp({ token_hash, type: 'recovery' })`. The default Supabase
   `ConfirmationURL` template is also accepted by the PKCE
   `exchangeCodeForSession` callback in the original browser, but
   cross-device operation is more reliable with the custom template.

6. Create a dedicated test Auth user and confirm the complete journey:
   account creation → request reset → email arrives → reset → login with new
   password works → login with old password fails. Repeat with an expired
   link and inactive profile (inactive users must still fail to log in).

## Free SMTP limitation: important

Supabase's *default* hosted SMTP is intended for demos, **not unrestricted
production team email**. It sends only to addresses authorized as members
of the Supabase organization's team; the documented default rate limit
is currently **2 emails per hour** (subject to change). This means the new
button can work in staged testing, but normal team members may not receive
email without a correctly configured custom SMTP provider.

For production team use, connect an SMTP provider within its genuine free
allowance, if available to the organization. A provider account, sender
verification and associated setup may be required; don't assume $0 email
delivery is guaranteed. Never paste SMTP or Supabase keys into GitHub,
the frontend, or chat messages.

Until SMTP is configured, the page offers the alternative to contact a team
leader for account recovery. Don't share ordinary passwords or token links
in a public channel.

Official documentation:
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp

## Release checklist

- [ ] Check recovery email template and exact staging redirect allowlist.
- [ ] Check SMTP deliverability and rate limits with a staging test account.
- [ ] Confirm duplicate/expired links are rejected.
- [ ] Confirm passwords cannot be changed without an authenticated session.
- [ ] Confirm sign-out after password change and successful new login.
- [ ] Confirm inactive user still cannot enter the workspace.
- [ ] Verify keyboard/mobile UI and use long Thai error messages.
- [ ] Never change Production SMTP/Auth settings before staging sign-off.

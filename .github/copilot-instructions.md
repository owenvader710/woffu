## Copilot usage notes for this repository

Short, actionable guidance to make AI coding agents productive in this Next.js + Supabase app.

- **Project type:** Next.js (app router, TypeScript). See `package.json` for versions and scripts.
- **Start / build commands:** `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for Supabase client helpers.

- **Application layout:** The project uses the new `app/` directory (server components by default) and Route Handlers under `app/api/**`.
  - Treat files under `app/api/*` as Next.js Route Handlers (server-only). Example: `app/api/_supabase.ts` contains `supabaseFromRequest`.

- **Supabase integration patterns:**
  - Server helpers: use `supabaseFromRequest(req)` from `app/api/_supabase.ts` to obtain `{ supabase, res }` in route handlers so cookies are synced to the outgoing `NextResponse`.
  - Browser helper: use the exported `supabaseBrowser` in `utils/supabase/client.ts` for client-side interactions.
  - There are additional helpers in `utils/supabase/` (see `admin.ts`, `api.ts`, `browser.ts`, `middleware.ts`, `server.ts`) — prefer extending these rather than duplicating logic.

- **Concurrency & cookie handling:** Route handlers rely on cookie parsing and `res.cookies.set(...)` behavior in `app/api/_supabase.ts`. Do not change cookie semantics without checking `supabaseFromRequest` and `utils/supabase/middleware.ts` first.

- **Files & canonical places to edit:**
  - Server-supabase entry: `app/api/_supabase.ts`
  - Client-supabase entry: `utils/supabase/client.ts`
  - Reusable server helpers: `utils/supabase/server.ts` and `utils/supabase/api.ts`
  - UI and pages: `app/` (components and pages live under `app/`, e.g. `app/layout.tsx`, `app/page.tsx`)

- **Types & formatting:** The repo is TypeScript-first (`tsconfig.json` present). Keep changes typed and run `npm run lint` as a quick check.

- **Patterns to follow when editing:**
  - Prefer adding small, focused helpers in `utils/supabase/` instead of sprinkling Supabase logic across components.
  - Keep server-only code in `app/api/` or files that don't rely on browser globals.
  - When a component needs client-side state or hooks, add `"use client"` at the top and import `supabaseBrowser` rather than server helpers.

- **Debugging and verification:**
  - Local dev server: `npm run dev` (http://localhost:3000)
  - Inspect route handler responses and `Set-Cookie` headers for auth flows that touch `supabaseFromRequest`.

- **When to open a PR:** Keep changes minimal, include a brief description of why Supabase behavior or API routing was changed, and reference the helper file(s) you modified.

If anything above is unclear or you want more examples (e.g., a small patch that shows a typical API route using `supabaseFromRequest`), tell me which area to expand.

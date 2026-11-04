// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getDeploymentSafety, isUnsafeMethod } from "@/lib/stagingSafety";

type SameSite = "lax" | "strict" | "none";
function normalizeSameSite(v: unknown): SameSite | undefined {
  if (v === true) return "lax";
  if (v === false) return undefined;
  if (v === "lax" || v === "strict" || v === "none") return v;
  return undefined;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const safety = getDeploymentSafety(process.env);

  // A preview linked to ANY database other than our dedicated free staging
  // project is a visual-only shell. Never authenticate, query production
  // records or use recovery tokens from a mismatched environment.
  if (safety.blockedDatabase) {
    if (pathname === "/api/runtime-mode") return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({
        code: "STAGING_REQUIRED",
        error: "Preview ยังไม่ได้เชื่อมต่อ Supabase Staging กรุณาตรวจ Environment Variables",
      }, { status: 423, headers: { "Cache-Control": "no-store" } });
    }
    if (pathname === "/auth/confirm") {
      const url = request.nextUrl.clone();
      url.pathname = "/forgot-password";
      url.search = "?error=preview_unavailable";
      return NextResponse.redirect(url);
    }
    const previewPages = ["/", "/login", "/forgot-password", "/reset-password"];
    if (!previewPages.includes(pathname) && !pathname.startsWith("/_next/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "?preview=staging_required";
      return NextResponse.redirect(url);
    }
    // Skip the Supabase Auth network call, including session refresh.
    return NextResponse.next({ request: { headers: request.headers } });
  }

  // Even when the staging database matches exactly, API writes require an
  // explicit opt-in. Sign-in/out can be used in read-only staging, but all
  // other mutations (including password reset and admin token generation)
  // remain disabled until a reviewer enables trusted staging writes.
  if (
    safety.readOnly &&
    pathname.startsWith("/api/") &&
    isUnsafeMethod(request.method) &&
    !["/api/login", "/api/logout"].includes(pathname)
  ) {
    return NextResponse.json({
      code: "PREVIEW_READ_ONLY",
      error: "Staging ยังอยู่ในโหมดอ่านอย่างเดียว",
    }, { status: 423, headers: { "Cache-Control": "no-store" } });
  }

  // GET recovery callbacks consume bearer tokens and establish sessions;
  // block them until staging write workflows are intentionally enabled.
  if (safety.readOnly && pathname === "/auth/confirm") {
    const url = request.nextUrl.clone();
    url.pathname = "/forgot-password";
    url.search = "?error=preview_unavailable";
    return NextResponse.redirect(url);
  }

  // root → /login
  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const sameSite = normalizeSameSite((options as any)?.sameSite);
            response.cookies.set({
              name,
              value,
              ...(options ?? {}),
              ...(sameSite ? { sameSite } : {}),
            });
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  const isPublic =
    pathname === "/login" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/auth/confirm" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico";

  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
// proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type SameSite = "lax" | "strict" | "none";
function normalizeSameSite(v: unknown): SameSite | undefined {
  if (v === true) return "lax";
  if (v === false) return undefined;
  if (v === "lax" || v === "strict" || v === "none") return v;
  return undefined;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
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
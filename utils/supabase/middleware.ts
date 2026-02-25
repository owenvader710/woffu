// utils/supabase/middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type SameSite = "lax" | "strict" | "none";

function normalizeSameSite(v: unknown): SameSite | undefined {
  if (v === true) return "lax";
  if (v === false) return undefined;
  if (v === "lax" || v === "strict" || v === "none") return v;
  return undefined;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ ใช้ request.cookies แทน cookieStore จาก next/headers
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // ✅ กัน sameSite boolean หลุดมา
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

  // ✅ ให้ supabase refresh session / load user (สำคัญกับ middleware flow)
  await supabase.auth.getUser();

  return response;
}
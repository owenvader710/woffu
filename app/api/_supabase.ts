// app/api/_supabase.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((kv) => {
      const eq = kv.indexOf("=");
      if (eq === -1) return { name: kv, value: "" };
      return { name: kv.slice(0, eq), value: kv.slice(eq + 1) };
    });
}

export function supabaseFromRequest(req: Request) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = req.headers.get("cookie");
          return parseCookieHeader(cookieHeader);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // NextResponse.cookies.set จะทำ Set-Cookie ให้
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return { supabase, res };
}

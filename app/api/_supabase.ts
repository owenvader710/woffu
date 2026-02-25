// app/api/_supabase.ts
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseFromRequest(_req: NextRequest) {
  const supabase = await createSupabaseServer();
  return { supabase };
}

export async function createSupabaseServer() {
  // ✅ Next.js 16: cookies() อาจเป็น Promise ในบาง context → ต้อง await
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // กันพังในบางกรณีที่ set cookie ไม่ได้ (เช่น server component)
          }
        },
      },
    }
  );
}
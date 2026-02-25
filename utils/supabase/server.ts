// utils/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type SameSite = "lax" | "strict" | "none";

function normalizeSameSite(v: unknown): SameSite | undefined {
  if (v === true) return "lax";
  if (v === false) return undefined;
  if (v === "lax" || v === "strict" || v === "none") return v;
  return undefined;
}

export async function createSupabaseServerClient() {
  // ✅ Next.js 16: cookies() อาจถูก type เป็น Promise → ต้อง await
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
          // Route Handlers / Server Actions set cookie ได้
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const sameSite = normalizeSameSite((options as any)?.sameSite);

              cookieStore.set(
                name,
                value,
                sameSite ? { ...(options ?? {}), sameSite } : (options ?? {})
              );
            });
          } catch {
            // กันพังในบาง context ที่ set cookie ไม่ได้ (เช่น server component บางแบบ)
          }
        },
      },
    }
  );
}
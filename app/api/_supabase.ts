import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ รองรับ @supabase/ssr ที่ต้องการ getAll/setAll
        getAll() {
          // Next cookies store ปกติมี getAll()
          const all = (cookieStore as any).getAll?.();
          if (Array.isArray(all)) {
            return all.map((c: any) => ({ name: c.name, value: c.value }));
          }

          // fallback: ถ้าไม่มี getAll แต่มี get (rare case)
          // คืนเป็น [] ไปก่อนเพื่อไม่ให้ throw
          return [];
        },

        setAll(cookiesToSet) {
          // Next cookies store ปกติมี set()
          for (const c of cookiesToSet ?? []) {
            try {
              cookieStore.set({
                name: c.name,
                value: c.value,
                ...(c.options ?? {}),
              });
            } catch {
              // ignore
            }
          }
        },
      } as any,
    }
  );
}
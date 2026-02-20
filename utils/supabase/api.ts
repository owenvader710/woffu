// utils/supabase/api.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  };
};

export function supabaseFromRequest(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // เก็บ cookies ที่ supabase ต้องการ set กลับไปที่ client
  const pending: CookieToSet[] = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // NextRequest มี req.cookies.getAll() ใช้ได้ใน route handlers
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookies) {
        // ssr client จะส่ง cookies มาให้ set — เราเก็บไว้ก่อน แล้วค่อย apply ใส่ response
        cookies.forEach((c) => {
          pending.push({ name: c.name, value: c.value, options: c.options });
        });
      },
    },
  });

  function applyCookies(res: NextResponse) {
    for (const c of pending) {
      res.cookies.set({
        name: c.name,
        value: c.value,
        ...c.options,
      });
    }
    return res;
  }

  return { supabase, applyCookies };
}

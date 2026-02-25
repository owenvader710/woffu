// utils/supabase/api.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

function normalizeSameSite(v: unknown): CookieOptions["sameSite"] {
  // Supabase serialize options อาจส่ง boolean มา (true/false)
  if (v === true) return "lax"; // เลือก default ที่ปลอดภัย
  if (v === false) return undefined;
  if (v === "lax" || v === "strict" || v === "none") return v;
  return undefined;
}

function normalizeOptions(opts: any): CookieOptions | undefined {
  if (!opts) return undefined;

  const sameSite = normalizeSameSite(opts.sameSite);

  // คัดเฉพาะ field ที่ NextResponse รับ
  const out: CookieOptions = {
    path: opts.path,
    domain: opts.domain,
    maxAge: opts.maxAge,
    expires: opts.expires,
    httpOnly: opts.httpOnly,
    secure: opts.secure,
    ...(sameSite ? { sameSite } : {}),
  };

  return out;
}

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
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(cookies) {
        cookies.forEach((c) => {
          pending.push({
            name: c.name,
            value: c.value,
            options: normalizeOptions(c.options),
          });
        });
      },
    },
  });

  function applyCookies(res: NextResponse) {
    for (const c of pending) {
      res.cookies.set({
        name: c.name,
        value: c.value,
        ...(c.options ?? {}),
      });
    }
    return res;
  }

  return { supabase, applyCookies };
}
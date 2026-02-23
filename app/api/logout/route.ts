// app/api/logout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function POST(req: NextRequest) {
  const { supabase, applyCookies } = supabaseFromRequest(req);

  await supabase.auth.signOut();

  const res = NextResponse.json({ ok: true }, { status: 200 });
  return applyCookies(res);
}
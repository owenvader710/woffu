import { NextRequest } from "next/server";

async function getParamId(
  req: NextRequest,
  ctx: { params?: any },
  regex: RegExp
) {
  // Next 16: params อาจเป็น Promise
  const rawParams = ctx?.params ? await ctx.params : null;
  const fromParams = rawParams?.id;
  if (fromParams) return String(fromParams);

  // fallback: parse จาก url
  const m = req.nextUrl.pathname.match(regex);
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

export async function GET(req: NextRequest, context: { params?: { id?: string } }) {
  try {
    const id = context?.params?.id;
    if (!id) return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        id, title, type, department, status, created_at, start_date, due_date, assignee_id, created_by,
        assignee:profiles!projects_assignee_id_fkey(id, display_name, department, role, avatar_url),
        creator:profiles!projects_created_by_fkey(id, display_name, department, role, avatar_url)
      `
      )
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const res = NextResponse.json({ data }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

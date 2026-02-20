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
    const projectId = context?.params?.id;
    if (!projectId)
      return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!auth?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("status_change_requests")
      .select(
        `
        id, project_id, from_status, to_status, request_status, created_at, requested_by, approved_by, approved_at,
        requester:profiles!status_change_requests_requested_by_fkey(id, display_name, avatar_url, department, role),
        approver:profiles!status_change_requests_approved_by_fkey(id, display_name, avatar_url, department, role)
      `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json({ data: data ?? [] }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

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

function extractProjectId(req: NextRequest, context?: { params?: { id?: string } }) {
  const fromParams = context?.params?.id;
  if (fromParams) return fromParams;

  // /api/projects/<id>/logs
  const path = req.nextUrl.pathname;
  const m = path.match(/\/api\/projects\/([^/]+)\/logs\/?$/);
  return m?.[1];
}

export async function GET(req: NextRequest, context: { params?: { id?: string } }) {
  try {
    const projectId = extractProjectId(req, context);
    if (!projectId) return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!authData?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ⚠️ ถ้า join profiles แล้วชน “more than one relationship…”
    // ให้ใช้การระบุ fk แบบนี้: profiles!project_logs_actor_id_fkey(...)
    const { data, error } = await supabase
      .from("project_logs")
      .select(
        `
        id, created_at, action, message, meta, actor_id,
        actor:profiles!project_logs_actor_id_fkey(id, display_name, avatar_url)
      `
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const res = NextResponse.json({ data });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

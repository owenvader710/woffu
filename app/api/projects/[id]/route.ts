// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function unwrapParams(ctx: any) {
  const p = ctx?.params;
  if (!p) return null;
  if (typeof p?.then === "function") return await p;
  return p;
}

function extractProjectId(req: NextRequest, paramsObj: any) {
  const fromParams = paramsObj?.id;
  if (fromParams) return fromParams;
  const path = req.nextUrl.pathname;
  const m = path.match(/\/api\/projects\/([^/]+)\/?$/);
  return m?.[1] ?? null;
}

// ✅ เพิ่ม PATCH ตรงนี้
export async function PATCH(req: NextRequest, ctx: any) {
  try {
    const paramsObj = await unwrapParams(ctx);
    const projectId = extractProjectId(req, paramsObj);

    if (!projectId) return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });
    if (!isUuid(projectId)) return NextResponse.json({ error: `Invalid project id: ${projectId}` }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    // auth
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!authData?.user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ เฉพาะหัวหน้าเท่านั้น (LEADER + active)
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", authData.user.id)
      .single();

    if (meErr) {
      const res = NextResponse.json({ error: meErr.message }, { status: 400 });
      return applyCookies(res);
    }
    if (!(me?.role === "LEADER" && me?.is_active === true)) {
      const res = NextResponse.json({ error: "เฉพาะหัวหน้าเท่านั้น" }, { status: 403 });
      return applyCookies(res);
    }

    // body
    const body = await req.json().catch(() => ({}));

    // ✅ whitelist fields ที่อนุญาตให้แก้
    const patch: any = {};
    const allowed = [
      "title",
      "type",
      "department",
      "brand",
      "assignee_id",
      "start_date",
      "due_date",
      "description",
      "video_priority",
      "video_purpose",
      "graphic_job_type",
      "status",
    ];

    for (const k of allowed) {
      if (k in body) patch[k] = body[k];
    }

    // กันค่าว่าง ๆ แบบไม่ตั้งใจ
    if (typeof patch.title === "string") patch.title = patch.title.trim();

    // ✅ update
    const { data, error } = await supabase
      .from("projects")
      .update(patch)
      .eq("id", projectId)
      .select(`
        id, title, type, department, status, created_at, start_date, due_date,
        assignee_id, created_by,
        brand, description, video_priority, video_purpose, graphic_job_type
      `)
      .single();

    if (error) {
      const res = NextResponse.json({ error: error.message }, { status: 400 });
      return applyCookies(res);
    }

    const res = NextResponse.json({ data }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
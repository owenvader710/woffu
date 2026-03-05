import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";
import { supabaseAdmin } from "@/utils/supabase/admin";

async function getParamId(
  req: NextRequest,
  ctx: { params?: Promise<{ id?: string }> | { id?: string } },
  regex: RegExp
) {
  const rawParams = ctx?.params ? await ctx.params : null;
  const fromParams = (rawParams as any)?.id;
  if (fromParams) return String(fromParams);

  const m = req.nextUrl.pathname.match(regex);
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

export async function POST(
  req: NextRequest,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const id = await getParamId(req, context, /\/api\/approvals\/([^/]+)\/reject\/?$/);
    if (!id) return NextResponse.json({ error: "Missing request id" }, { status: 400 });

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    // ✅ leader only
    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (meErr) return NextResponse.json({ error: meErr.message }, { status: 400 });
    const isLeader = me?.role === "LEADER" && me?.is_active !== false;
    if (!isLeader) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

    const admin = supabaseAdmin();

    const { data: reqRow, error: reqErr } = await admin
      .from("status_change_requests")
      .select("id, project_id, from_status, to_status, request_status, requested_by, created_at")
      .eq("id", id)
      .maybeSingle();

    if (reqErr) {
      const res = NextResponse.json({ error: reqErr.message }, { status: 400 });
      return applyCookies(res);
    }
    if (!reqRow) {
      const res = NextResponse.json({ error: "Not found" }, { status: 404 });
      return applyCookies(res);
    }
    if (reqRow.request_status !== "PENDING") {
      const res = NextResponse.json({ error: "Already processed" }, { status: 409 });
      return applyCookies(res);
    }

    const { error: upReqErr } = await admin
      .from("status_change_requests")
      .update({ request_status: "REJECTED" })
      .eq("id", id);

    if (upReqErr) {
      const res = NextResponse.json({ error: upReqErr.message }, { status: 400 });
      return applyCookies(res);
    }

    await admin.from("project_logs").insert({
      project_id: reqRow.project_id,
      actor_id: user.id,
      action: "STATUS_REJECTED",
      message: `Rejected status change: ${reqRow.from_status} -> ${reqRow.to_status}`,
      meta: { from_status: reqRow.from_status, to_status: reqRow.to_status, mode: "REJECTED" },
    });

    const res = NextResponse.json({ ok: true }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}
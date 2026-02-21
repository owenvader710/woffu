import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

async function getParamId(
  req: NextRequest,
  ctx: { params?: Promise<{ id?: string }> | { id?: string } },
  regex: RegExp
) {
  const rawParams = ctx?.params ? await ctx.params : null;
  const fromParams = rawParams?.id;
  if (fromParams) return String(fromParams);

  const m = req.nextUrl.pathname.match(regex);
  return m?.[1] ? decodeURIComponent(m[1]) : "";
}

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(
  req: NextRequest,
  context: { params?: Promise<{ id?: string }> | { id?: string } }
) {
  try {
    const projectId = await getParamId(
      req,
      context,
      /\/api\/projects\/([^/]+)\/request-status\/?$/
    );

    if (!projectId) {
      return NextResponse.json({ error: "Missing project id (params.id)" }, { status: 400 });
    }

    if (!isUuid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const { supabase, applyCookies } = supabaseFromRequest(req);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

    const user = authData?.user;
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const from_status = body?.from_status;
    const to_status = body?.to_status;

    if (!from_status || !to_status) {
      return NextResponse.json({ error: "Missing from_status/to_status" }, { status: 400 });
    }

    const { data: pending, error: pendErr } = await supabase
      .from("status_change_requests")
      .select("id")
      .eq("project_id", projectId)
      .eq("requested_by", user.id)
      .eq("request_status", "PENDING")
      .limit(1);

    if (pendErr) return NextResponse.json({ error: pendErr.message }, { status: 400 });

    if (pending && pending.length > 0) {
      const res = NextResponse.json(
        { ok: true, message: "Already pending (wait for manager approval first)" },
        { status: 200 }
      );
      return applyCookies(res);
    }

    const { error: insErr } = await supabase.from("status_change_requests").insert({
      project_id: projectId,
      from_status,
      to_status,
      request_status: "PENDING",
      requested_by: user.id,
      created_at: new Date().toISOString(),
    });

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    const { error: logErr } = await supabase.from("project_logs").insert({
      project_id: projectId,
      actor_id: user.id,
      action: "STATUS_REQUESTED",
      message: `Requested status change: ${from_status} -> ${to_status}`,
      meta: { from_status, to_status, mode: "REQUESTED" },
    });

    if (logErr) {
      return NextResponse.json({ error: `Log insert failed: ${logErr.message}` }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true, mode: "REQUESTED" }, { status: 200 });
    return applyCookies(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}

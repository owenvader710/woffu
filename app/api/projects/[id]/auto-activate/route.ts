import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    const { data: project, error: projErr } = await admin
      .from("projects")
      .select("id, status, start_date")
      .eq("id", id)
      .single();

    if (projErr) {
      return NextResponse.json({ error: projErr.message }, { status: 500 });
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "PRE_ORDER") {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!project.start_date) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const start = new Date(project.start_date);
    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    start.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start.getTime() > today.getTime()) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const { error: updErr } = await admin
      .from("projects")
      .update({ status: "TODO" })
      .eq("id", id)
      .eq("status", "PRE_ORDER");

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    await admin.from("project_logs").insert({
      project_id: id,
      action: "STATUS_AUTO_CHANGED",
      message: "Auto changed status: PRE_ORDER -> TODO",
      detail: {
        from_status: "PRE_ORDER",
        to_status: "TODO",
        mode: "AUTO",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
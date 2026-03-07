import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";
import { createSupabaseAdmin } from "../../_supabaseAdmin";
import { sendPushToUser } from "../../_push";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const projectId = String(body?.project_id || "").trim();

  if (!projectId) {
    return NextResponse.json({ error: "Missing project_id" }, { status: 400 });
  }

  const { data: project, error: projectErr } = await admin
    .from("projects")
    .select("id, title, code, assignee_id, created_by")
    .eq("id", projectId)
    .single();

  if (projectErr) return NextResponse.json({ error: projectErr.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  if (project.assignee_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!project.created_by || project.created_by === user.id) {
    return NextResponse.json({ ok: true });
  }

  const title = "มีการรับทราบงานแล้ว";
  const message = `${project.code ? `[${project.code}] ` : ""}${project.title || "งาน"} ถูกกดรับทราบแล้ว`;

  try {
    await admin.from("notifications").insert({
      user_id: project.created_by,
      type: "JOB_ACKNOWLEDGED",
      title,
      message,
      link: `/projects/${project.id}`,
      is_read: false,
    });
  } catch {}

  try {
    await sendPushToUser({
      userId: project.created_by,
      title,
      message,
      url: `/projects/${project.id}`,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
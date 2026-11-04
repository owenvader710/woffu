import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { sendPushToUser } from "@/app/api/_push";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export async function POST(req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.supabase || !access.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const projectId = typeof body?.project_id === "string" ? body.project_id.trim() : "";
  if (!UUID.test(projectId)) {
    return NextResponse.json({ error: "Invalid project_id" }, { status: 400 });
  }

  const { data: project, error } = await access.supabase
    .from("projects")
    .select("id, title, code, assignee_id, created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load project" }, { status: 500 });
  if (!project || project.assignee_id !== access.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!project.created_by || project.created_by === access.user.id) {
    return NextResponse.json({ ok: true });
  }

  const admin = createSupabaseAdmin();
  const link = `/projects/${project.id}`;
  // An acknowledgement isn't a new activity every time the same user
  // clicks the button. Avoid repeated manager notifications on retries.
  const { data: previous, error: lookupError } = await admin.from("notifications")
    .select("id")
    .eq("user_id", project.created_by)
    .eq("type", "JOB_ACKNOWLEDGED")
    .eq("link", link)
    .limit(1);
  if (lookupError) {
    console.warn("[ACK] Could not check existing notification", lookupError.code);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการรับทราบได้" }, { status: 503 });
  }
  if (previous?.length) return NextResponse.json({ ok: true, alreadyAcknowledged: true });

  const title = "มีการรับทราบงานแล้ว";
  const message = `${project.code ? `[${project.code}] ` : ""}${project.title || "งาน"} ถูกกดรับทราบแล้ว`;
  const { error: notifyError } = await admin.from("notifications").insert({
    user_id: project.created_by,
    type: "JOB_ACKNOWLEDGED",
    title, message, link, is_read: false,
  });
  if (notifyError) {
    console.warn("[ACK] Notification unavailable", notifyError.code);
    return NextResponse.json({ error: "ไม่สามารถบันทึกการรับทราบได้" }, { status: 503 });
  }

  try {
    await sendPushToUser({ userId: project.created_by, title, message, url: link });
  } catch {
    console.warn("[ACK] Optional Push delivery unavailable");
  }
  return NextResponse.json({ ok: true });
}

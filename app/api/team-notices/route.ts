import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "../_authorization";
import { createSupabaseAdmin } from "../_supabaseAdmin";
import { sendPushToUser } from "../_push";

function normalizeNoticeType(value: unknown) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "URGENT") return "URGENT";
  if (raw === "EVENT") return "EVENT";
  return "GENERAL";
}

export async function GET() {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  const supabase = access.supabase;

  const { data, error } = await supabase
    .from("team_notices")
    .select("*")
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  const user = access.user;
  const admin = createSupabaseAdmin();

  const isLeader = access.profile.role === "LEADER" || access.profile.role === "ADMIN";

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.title !== "string" ||
      (body.content != null && typeof body.content !== "string")) {
    return NextResponse.json({ error: "Invalid title/content" }, { status: 400 });
  }
  const title = body.title.trim();
  const content = (body.content ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "กรุณาระบุหัวข้อประกาศ" }, { status: 400 });
  }

  const insertRow = {
    title,
    content: content || null,
    notice_type: normalizeNoticeType(body.notice_type),
    attachment_url: body.attachment_url ? String(body.attachment_url) : null,
    attachment_name: body.attachment_name ? String(body.attachment_name) : null,
    is_pinned: isLeader ? !!body.is_pinned : false,
    is_active: true,
    created_by: user.id,
  };

  const { data, error } = await admin
    .from("team_notices")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id")
      .eq("is_active", true);

    const targetUsers = (profiles || [])
      .map((x) => x.id)
      .filter((id) => id && id !== user.id);

    if (targetUsers.length > 0) {
      const noticeTitle = title;
      const noticeSummary = content
        ? String(content).replace(/\s+/g, " ").trim().slice(0, 80)
        : "กรุณาเข้าไปอ่านรายละเอียด";

      const pushTitle = "มีประกาศทีมใหม่";
      const pushMessage = `${noticeTitle} • ${noticeSummary}`;
      const pushLink = "/team-notices";

      try {
        await admin.from("notifications").insert(
          targetUsers.map((uid) => ({
            user_id: uid,
            type: "TEAM_NOTICE",
            title: pushTitle,
            message: pushMessage,
            link: pushLink,
            is_read: false,
          }))
        );
      } catch {}

      await Promise.allSettled(
        targetUsers.map((uid) =>
          sendPushToUser({
            userId: uid,
            title: pushTitle,
            message: pushMessage,
            url: pushLink,
          })
        )
      );
    }
  } catch {
    // ไม่ให้ notification ทำให้การสร้างประกาศล้ม
  }

  return NextResponse.json({ data }, { status: 201 });
}
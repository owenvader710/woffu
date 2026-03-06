import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";
import { createSupabaseAdmin } from "../_supabaseAdmin";

type NoticeType = "GENERAL" | "LEAVE" | "MEETING" | "ISSUE" | "URGENT";

function normalizeNoticeType(v: unknown): NoticeType {
  const s = String(v || "").toUpperCase();
  if (s === "LEAVE" || s === "MEETING" || s === "ISSUE" || s === "URGENT") return s;
  return "GENERAL";
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("q")?.trim() || "";
  const type = req.nextUrl.searchParams.get("type")?.trim() || "ALL";
  const pinned = req.nextUrl.searchParams.get("pinned") === "1";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 20), 100);

  let query = admin
    .from("team_notices")
    .select("*")
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type !== "ALL") {
    query = query.eq("notice_type", normalizeNoticeType(type));
  }

  if (pinned) {
    query = query.eq("is_pinned", true);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const notices = Array.isArray(data) ? data : [];
  const creatorIds = [...new Set(notices.map((x) => x.created_by).filter(Boolean))];

  let profileMap = new Map<string, { display_name: string | null; role: string | null }>();

  if (creatorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, role")
      .in("id", creatorIds);

    for (const p of profiles || []) {
      profileMap.set(p.id, {
        display_name: p.display_name ?? null,
        role: p.role ?? null,
      });
    }
  }

  const rows = notices.map((n) => ({
    ...n,
    creator: profileMap.get(n.created_by) || null,
  }));

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me, error: meErr } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (meErr) return NextResponse.json({ error: meErr.message }, { status: 500 });
  if (!me || me.is_active === false) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const isLeader = me.role === "LEADER" || me.role === "ADMIN";

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

  return NextResponse.json({ data }, { status: 201 });
}
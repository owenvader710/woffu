import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { requireActiveManager } from "@/app/api/_authorization";
import { getTrustedSiteOrigin } from "@/lib/stagingSafety";

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recoveryOrigin(request: NextRequest): string | null {
  return getTrustedSiteOrigin(
    process.env.NEXT_PUBLIC_SITE_URL,
    request.nextUrl.origin,
    process.env.NODE_ENV === "development"
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });

  const access = await requireActiveManager();
  if (access.response) return access.response;
  if (!access.user || !access.supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (id === access.user.id) {
    return NextResponse.json({ error: "กรุณากู้คืนบัญชีตัวเองจากหน้า Login" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.identityVerified !== true) {
    return NextResponse.json(
      { error: "ต้องยืนยันตัวตนกับเจ้าของบัญชีก่อนออกลิงก์" },
      { status: 400 }
    );
  }

  const origin = recoveryOrigin(request);
  if (!origin) return NextResponse.json({
    error: "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SITE_URL เป็น HTTPS ของเว็บไซต์นี้",
  }, { status: 503 });

  const { data: member, error: memberError } = await access.supabase
    .from("profiles")
    .select("id, email, role, is_active")
    .eq("id", id)
    .maybeSingle();
  if (memberError || !member?.is_active || member.role !== "MEMBER" || !member.email) {
    // A LEADER must not be able to take over another LEADER's account.
    return NextResponse.json(
      { error: "กู้คืนได้เฉพาะบัญชี MEMBER ที่เปิดใช้งานอยู่" },
      { status: 403 }
    );
  }

  try {
    const admin = createSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.admin.getUserById(id);
    const email = authData.user?.email;
    if (authError || !email || email.toLowerCase() !== member.email.toLowerCase()) {
      return NextResponse.json({ error: "ไม่พบบัญชี Auth ที่ตรงกับสมาชิก" }, { status: 409 });
    }

    // Prevent repeated issuance of bearer reset links for the same member.
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", id)
      .eq("type", "ACCOUNT_RECOVERY")
      .gte("created_at", since)
      .limit(1);
    if (recentError) {
      return NextResponse.json({ error: "ไม่สามารถตรวจสอบประวัติการกู้คืนได้" }, { status: 503 });
    }
    if (recent && recent.length) {
      return NextResponse.json({
        error: "มีการออกลิงก์ให้บัญชีนี้เมื่อไม่นานมานี้ กรุณารอ 15 นาทีก่อนสร้างใหม่",
      }, { status: 429 });
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${origin}/auth/confirm` },
    });
    // Auth service issues a single-use token without sending an email.
    const hashedToken = data?.properties?.hashed_token;
    if (error || !hashedToken || !/^[a-f0-9]{64}$/i.test(hashedToken)) {
      console.error("[MEMBER RECOVERY] Could not issue recovery token", error?.code || "invalid_token");
      return NextResponse.json({ error: "ไม่สามารถสร้างลิงก์กู้คืนได้" }, { status: 503 });
    }

    // An audit notification contains NO token or URL. The affected member
    // sees this when they next sign in, even if email delivery is unavailable.
    const { error: auditError } = await admin.from("notifications").insert({
      user_id: id,
      type: "ACCOUNT_RECOVERY",
      title: "มีการออกลิงก์ตั้งรหัสผ่านใหม่",
      message: `หัวหน้าทีมออกลิงก์กู้คืนบัญชีให้คุณ (ผู้ดำเนินการ: ${access.user.id}) หากไม่ได้ร้องขอ โปรดแจ้งผู้ดูแลทันที`,
      link: "/members",
      is_read: false,
    });
    if (auditError) {
      console.error("[MEMBER RECOVERY] Audit notification failed", auditError.code);
      return NextResponse.json({ error: "ไม่สามารถบันทึกประวัติการกู้คืนได้" }, { status: 503 });
    }

    const link = new URL("/auth/confirm", origin);
    link.searchParams.set("token_hash", hashedToken);
    link.searchParams.set("type", "recovery");

    return NextResponse.json(
      { ok: true, recoveryLink: link.toString() },
      { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } }
    );
  } catch (error) {
    console.error("[MEMBER RECOVERY] Service unavailable", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "บริการกู้คืนบัญชียังไม่พร้อมใช้งาน" }, { status: 503 });
  }
}

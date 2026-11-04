import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";

type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES = ["MEMBER", "LEADER"];
const DEPARTMENTS = ["VIDEO", "GRAPHIC", "ALL"];

export async function PATCH(req: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
  }
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.user || !access.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const manager = access.profile.role === "LEADER" || access.profile.role === "ADMIN";
  const isSelf = id === access.user.id;
  if (!manager && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const allowedKeys = manager
    ? ["display_name", "phone", "birth_date", "role", "department", "is_active", "email"]
    : ["display_name", "phone", "birth_date"];
  if (Object.keys(body).some(key => !allowedKeys.includes(key))) {
    return NextResponse.json({ error: "ไม่อนุญาตให้แก้ไขข้อมูลนี้" }, { status: 403 });
  }
  const admin = createSupabaseAdmin();
  const { data: existing, error: lookupError } = await admin.from("profiles")
    .select("id, email, role, is_active")
    .eq("id", id).maybeSingle();
  if (lookupError) {
    return NextResponse.json({ error: "ตรวจสอบสมาชิกไม่สำเร็จ" }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: "ไม่พบสมาชิก" }, { status: 404 });

  const patch: Record<string, string | boolean | null> = {};
  if (Object.prototype.hasOwnProperty.call(body, "display_name")) {
    if (body.display_name !== null && typeof body.display_name !== "string") {
      return NextResponse.json({ error: "Invalid display name" }, { status: 400 });
    }
    const name = body.display_name?.trim() || null;
    if (name && name.length > 120) return NextResponse.json({ error: "ชื่อยาวเกินไป" }, { status: 400 });
    patch.display_name = name;
  }
  if (Object.prototype.hasOwnProperty.call(body, "phone")) {
    if (body.phone !== null && typeof body.phone !== "string") {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }
    const phone = body.phone?.trim() || null;
    if (phone && phone.length > 40) return NextResponse.json({ error: "เบอร์โทรยาวเกินไป" }, { status: 400 });
    patch.phone = phone;
  }
  if (Object.prototype.hasOwnProperty.call(body, "birth_date")) {
    const birth = body.birth_date === "" ? null : body.birth_date;
    if (birth !== null && (typeof birth !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
        !Number.isFinite(Date.parse(birth)))) {
      return NextResponse.json({ error: "วันเกิดไม่ถูกต้อง" }, { status: 400 });
    }
    patch.birth_date = birth;
  }

  if (manager) {
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      patch.role = body.role;
    }
    if (body.department !== undefined) {
      if (!DEPARTMENTS.includes(body.department)) {
        return NextResponse.json({ error: "Invalid department" }, { status: 400 });
      }
      patch.department = body.department;
    }
    if (body.is_active !== undefined) {
      if (typeof body.is_active !== "boolean") {
        return NextResponse.json({ error: "Invalid account status" }, { status: 400 });
      }
      patch.is_active = body.is_active;
    }
    if (body.email !== undefined &&
        (typeof body.email !== "string" ||
         body.email.trim().toLowerCase() !== (existing.email || "").trim().toLowerCase())) {
      // Profile-only edits break Supabase Auth login/recovery, so the email
      // address must be changed in the Auth account lifecycle, not here.
      return NextResponse.json({
        error: "การเปลี่ยนอีเมลต้องทำผ่านระบบยืนยันบัญชี ไม่สามารถแก้จากโปรไฟล์ได้",
      }, { status: 400 });
    }
    if (isSelf &&
        ((patch.is_active === false) || (patch.role && patch.role !== "LEADER"))) {
      return NextResponse.json({
        error: "หัวหน้าทีมไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีตัวเองได้",
      }, { status: 403 });
    }
    if (existing.role === "LEADER" &&
        (patch.role === "MEMBER" || patch.is_active === false)) {
      const { count, error: countError } = await admin.from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "LEADER").eq("is_active", true);
      if (countError) return NextResponse.json({ error: "ตรวจสอบจำนวนหัวหน้าทีมไม่สำเร็จ" }, { status: 500 });
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: "ต้องเหลือหัวหน้าทีมที่ใช้งานได้อย่างน้อยหนึ่งคน" },
          { status: 409 });
      }
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องแก้ไข" }, { status: 400 });
  }
  const { data, error } = await admin.from("profiles")
    .update(patch).eq("id", id)
    .select("id, display_name, department, role, is_active, avatar_url, phone, email, birth_date")
    .maybeSingle();
  if (error || !data) {
    console.error("[MEMBERS] Profile update failed", error?.code || "no_row");
    return NextResponse.json({ error: "บันทึกข้อมูลสมาชิกไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}

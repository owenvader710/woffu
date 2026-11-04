import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { validatePublicAttachment } from "@/app/api/_uploadValidation";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid upload origin" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "กรุณาเลือกรูปโปรไฟล์" }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json({ error: "รูปโปรไฟล์ต้องไม่เกิน 2 MB" }, { status: 413 });
  }
  const validated = await validatePublicAttachment(file);
  if ("error" in validated) return validated.error;
  if (validated.mime !== "image/png") {
    return NextResponse.json({ error: "ใช้รูปโปรไฟล์ PNG ที่ Crop แล้วเท่านั้น" }, { status: 415 });
  }

  const admin = createSupabaseAdmin();
  const path = `${access.user.id}/avatar-${randomUUID()}.png`;
  const { error: uploadError } = await admin.storage.from("avatars").upload(
    path, validated.buffer, { contentType: "image/png", upsert: false }
  );
  if (uploadError) {
    console.warn("[AVATAR] Upload failed", uploadError.message);
    return NextResponse.json({ error: "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }

  const { data: publicUrl } = admin.storage.from("avatars").getPublicUrl(path);
  const { error: updateError } = await admin.from("profiles")
    .update({ avatar_url: publicUrl.publicUrl }).eq("id", access.user.id);

  if (updateError) {
    await admin.storage.from("avatars").remove([path]);
    console.warn("[AVATAR] Profile update failed", updateError.code);
    return NextResponse.json({ error: "บันทึกรูปโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ data: { url: publicUrl.publicUrl } },
    { headers: { "Cache-Control": "private, no-store" } });
}

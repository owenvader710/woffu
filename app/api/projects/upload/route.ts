import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/app/api/_authorization";
import { createSupabaseAdmin } from "@/app/api/_supabaseAdmin";
import { validatePublicAttachment } from "@/app/api/_uploadValidation";

export async function POST(req: NextRequest) {
  const access = await requireActiveUser();
  if (access.response) return access.response;
  if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์แนบ" }, { status: 400 });
  }

  const validated = await validatePublicAttachment(file);
  if ("error" in validated) return validated.error;

  // Only small public preview assets belong in Storage. Store large or
  // confidential source footage in Drive and attach its access-controlled link.
  const filePath = `${access.user.id}/${randomUUID()}-${validated.safeFilename}`;
  const admin = createSupabaseAdmin();
  const { error } = await admin.storage.from("project-files").upload(filePath, validated.buffer, {
    contentType: validated.mime,
    upsert: false,
  });
  if (error) {
    console.error("[UPLOAD] Storage failed", error.message);
    return NextResponse.json({ error: "ไม่สามารถอัปโหลดไฟล์ได้" }, { status: 500 });
  }

  const { data } = admin.storage.from("project-files").getPublicUrl(filePath);
  return NextResponse.json({
    data: {
      url: data.publicUrl,
      name: file.name.slice(0, 160),
      path: filePath,
    },
  });
}

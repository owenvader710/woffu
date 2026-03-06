import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../../_supabase";
import { createSupabaseAdmin } from "../../_supabaseAdmin";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const admin = createSupabaseAdmin();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });

  const user = authData?.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const filePath = `${user.id}/${Date.now()}-${safeName(file.name)}`;

  const { error } = await admin.storage
    .from("team-notices")
    .upload(filePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from("team-notices").getPublicUrl(filePath);

  return NextResponse.json({
    data: {
      url: data.publicUrl,
      name: file.name,
      path: filePath,
    },
  });
}
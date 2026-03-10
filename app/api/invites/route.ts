import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "../_supabase";
import { createSupabaseAdmin } from "../_supabaseAdmin";
import { sendInviteEmail } from "../_mailer";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    const admin = createSupabaseAdmin();

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: me } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (!me?.is_active) {
      return NextResponse.json({ error: "Inactive profile" }, { status: 403 });
    }

    if (me.role !== "LEADER") {
      return NextResponse.json(
        { error: "Only leader can invite members" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "MEMBER").toUpperCase();
    const department = String(body?.department || "ALL").toUpperCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const { data: existingInvite } = await admin
      .from("invites")
      .select("id")
      .eq("email", email)
      .is("used_at", null)
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: "This email already has a pending invite" },
        { status: 400 }
      );
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { error: inviteErr } = await admin.from("invites").insert({
      email,
      role,
      department,
      invited_by: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const inviteLink = `${siteUrl}/invite/${rawToken}`;

    await sendInviteEmail({
      to: email,
      inviteLink,
    });

    return NextResponse.json({
      ok: true,
      message: "Invite sent successfully",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
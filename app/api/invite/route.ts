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

    console.log("[INVITE] POST called");

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    console.log("[INVITE] authErr =", authErr);

    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 401 });
    }

    const user = authData?.user;
    console.log("[INVITE] user =", user?.id);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: me, error: meErr } = await supabase
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    console.log("[INVITE] meErr =", meErr);
    console.log("[INVITE] me =", me);

    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 400 });
    }

    if (!me?.is_active) {
      return NextResponse.json({ error: "Inactive profile" }, { status: 403 });
    }

    const leaderLike = me.role === "LEADER";
    if (!leaderLike) {
      return NextResponse.json({ error: "Only leader can invite members" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    console.log("[INVITE] body =", body);

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    const role = String(body?.role || "MEMBER")
      .trim()
      .toUpperCase();

    const department = String(body?.department || "ALL")
      .trim()
      .toUpperCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!["LEADER", "MEMBER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (!["VIDEO", "GRAPHIC", "ALL"].includes(department)) {
      return NextResponse.json({ error: "Invalid department" }, { status: 400 });
    }

    const { data: existingInvite, error: existingInviteErr } = await admin
      .from("invites")
      .select("id, email, used_at, expires_at")
      .eq("email", email)
      .is("used_at", null)
      .maybeSingle();

    console.log("[INVITE] existingInviteErr =", existingInviteErr);
    console.log("[INVITE] existingInvite =", existingInvite);

    if (existingInviteErr) {
      return NextResponse.json({ error: existingInviteErr.message }, { status: 400 });
    }

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

    console.log("[INVITE] inviteErr =", inviteErr);

    if (inviteErr) {
      return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteLink = `${siteUrl}/invite/${rawToken}`;

    console.log("[INVITE] siteUrl =", siteUrl);
    console.log("[INVITE] inviteLink =", inviteLink);
    console.log("[INVITE] hasMailer =", typeof sendInviteEmail === "function");

    await sendInviteEmail({
      to: email,
      inviteLink,
    });

    console.log("[INVITE] email sent ok");

    return NextResponse.json({
      ok: true,
      message: "Invite sent successfully",
    });
  } catch (e: any) {
    console.log("[INVITE] catch =", e);
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}
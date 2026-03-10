import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../_supabaseAdmin";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isStrongPassword(password: string) {
  return password.length >= 8;
}

async function getTokenFromContext(
  context: { params?: Promise<{ token?: string }> | { token?: string } }
) {
  const rawParams = context?.params ? await context.params : null;
  return String(rawParams?.token || "").trim();
}

export async function GET(
  _req: NextRequest,
  context: { params?: Promise<{ token?: string }> | { token?: string } }
) {
  try {
    const admin = createSupabaseAdmin();
    const token = await getTokenFromContext(context);

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const { data: invite, error } = await admin
      .from("invites")
      .select("id, email, role, department, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.used_at) return NextResponse.json({ error: "Invite already used" }, { status: 400 });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        email: invite.email,
        role: invite.role,
        department: invite.department,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params?: Promise<{ token?: string }> | { token?: string } }
) {
  try {
    const admin = createSupabaseAdmin();
    const token = await getTokenFromContext(context);

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const password = String(body?.password || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (!isStrongPassword(password)) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const { data: invite, error: inviteErr } = await admin
      .from("invites")
      .select("id, email, role, department, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 });
    if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    if (invite.used_at) return NextResponse.json({ error: "Invite already used" }, { status: 400 });
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 400 });
    }

    const created = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
    });

    if (created.error) {
      return NextResponse.json({ error: created.error.message }, { status: 400 });
    }

    const authUser = created.data.user;
    if (!authUser?.id) {
      return NextResponse.json({ error: "Failed to create auth user" }, { status: 400 });
    }

    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: authUser.id,
        display_name: null,
        role: invite.role,
        department: invite.department,
        email: invite.email,
        is_active: true,
        avatar_url: null,
        phone: null,
        birth_date: null,
      },
      {
        onConflict: "id",
      }
    );

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    const { error: usedErr } = await admin
      .from("invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (usedErr) {
      return NextResponse.json({ error: usedErr.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Account created successfully",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
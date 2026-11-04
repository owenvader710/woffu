import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../_supabaseAdmin";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isStrongPassword(password: string) {
  return password.length >= 10 && password.length <= 128;
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

    if (!/^[0-9a-f]{64}$/i.test(token)) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
    }

    const tokenHash = hashToken(token);

    const { data: invite, error } = await admin
      .from("invites")
      .select("id, email, display_name, role, department, expires_at, used_at")
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
        display_name: invite.display_name,
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
      return NextResponse.json({ error: "รหัสผ่านต้องมี 10–128 ตัวอักษร" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    if (!/^[0-9a-f]{64}$/i.test(token)) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const claimedAt = new Date().toISOString();

    // Claim atomically BEFORE creating an Auth account. Two simultaneous requests
    // cannot consume the same invite; the second update matches zero rows.
    const { data: invite, error: claimError } = await admin
      .from("invites")
      .update({ used_at: claimedAt })
      .eq("token_hash", tokenHash)
      .is("used_at", null)
      .gt("expires_at", claimedAt)
      .select("id, email, display_name, role, department")
      .maybeSingle();

    if (claimError) {
      console.error("[INVITES] Could not claim invitation", claimError.code);
      return NextResponse.json({ error: "Could not accept invitation" }, { status: 500 });
    }
    if (!invite) {
      return NextResponse.json(
        { error: "Invitation expired, already used, or unavailable" },
        { status: 409 }
      );
    }

    // Narrow the claimed ID before the async closure for strict TypeScript.
    const inviteId = invite.id;
    // Only release the *same* claim on failure. A newer claim must never
    // be cleared by a request that failed earlier.
    async function releaseClaim() {
      const { error } = await admin.from("invites")
        .update({ used_at: null })
        .eq("id", inviteId)
        .eq("used_at", claimedAt);
      if (error) console.error("[INVITES] Claim release failed", error.code);
    }

    let created: Awaited<ReturnType<typeof admin.auth.admin.createUser>>;
    try {
      created = await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { display_name: invite.display_name || invite.email },
      });
    } catch (error) {
      await releaseClaim();
      console.error("[INVITES] Auth service temporarily unavailable", error);
      return NextResponse.json(
        { error: "บริการสร้างบัญชีไม่พร้อมใช้งาน กรุณาลองอีกครั้ง" },
        { status: 503 }
      );
    }

    if (created.error || !created.data?.user?.id) {
      await releaseClaim();
      return NextResponse.json({
        error: created.error?.message || "Could not create account",
      }, { status: 400 });
    }

    const authUserId = created.data.user.id;
    const { error: profileError } = await admin.from("profiles").upsert({
      id: authUserId,
      display_name: invite.display_name || invite.email,
      role: invite.role,
      department: invite.department,
      email: invite.email,
      is_active: true,
      avatar_url: null,
      phone: null,
      birth_date: null,
    }, { onConflict: "id" });

    if (profileError) {
      // Creating Auth and writing a profile are separate services. Compensate
      // for partial failure; never leave an unapproved MEMBER account behind.
      const { error: cleanupError } = await admin.auth.admin.deleteUser(authUserId);
      if (!cleanupError) await releaseClaim();
      else console.error("[INVITES] Manual cleanup needed for partially created user", cleanupError.message);
      return NextResponse.json({
        error: "Could not finish account setup. Contact your team leader.",
      }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Account created successfully",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
  }
}
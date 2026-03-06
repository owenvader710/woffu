import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createSupabaseAdmin } from "../../_supabaseAdmin";

function getEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function initWebPush() {
  webpush.setVapidDetails(
    "mailto:admin@woffu.local",
    getEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY"),
    getEnv("VAPID_PRIVATE_KEY")
  );
}

export async function POST(req: NextRequest) {
  try {
    initWebPush();
    const admin = createSupabaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const userId = String(body.user_id || "").trim();
    const title = String(body.title || "").trim();
    const message = String(body.message || "").trim();
    const url = String(body.url || "/notifications").trim();

    if (!userId || !title) {
      return NextResponse.json({ error: "Missing user_id/title" }, { status: 400 });
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(subs) ? subs : [];
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let sent = 0;

    for (const sub of rows) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title,
            body: message,
            url,
            tag: `${userId}-${Date.now()}`,
          })
        );
        sent += 1;
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Push send failed" }, { status: 500 });
  }
}
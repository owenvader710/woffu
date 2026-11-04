import webpush from "web-push";
import { createSupabaseAdmin } from "./_supabaseAdmin";
import { normalizeInternalNotificationPath } from "@/lib/notificationUrl";

/**
 * One no-cost Browser Push transport (VAPID), matching the explicit opt-in
 * button on NotificationCenter. DB notifications work without these keys.
 * Historical FCM tokens are deliberately not used in WOFFU OS V2.
 */
export async function sendPushToUser({
  userId, title, message, url,
}: {
  userId: string;
  title: string;
  message: string;
  url?: string;
}) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject ||
      !(subject.startsWith("mailto:") || subject.startsWith("https://"))) {
    return { ok: true, sent: 0, reason: "PUSH_NOT_CONFIGURED" };
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch {
    console.warn("[WEB PUSH] Invalid VAPID configuration");
    return { ok: false, sent: 0, reason: "INVALID_VAPID_CONFIG" };
  }

  const db = createSupabaseAdmin();
  const { data: subscriptions, error } = await db.from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .limit(30);
  if (error) {
    console.warn("[WEB PUSH] Subscription lookup failed", error.code);
    return { ok: false, sent: 0, reason: "SUBSCRIPTION_LOOKUP_FAILED" };
  }

  const payload = JSON.stringify({
    title: title.slice(0, 120),
    body: message.slice(0, 500),
    url: normalizeInternalNotificationPath(url),
    tag: "woffu-workflow",
  });

  let sent = 0;
  // Bounded concurrency avoids a slow or broken endpoint delaying an entire
  // approval workflow. Never print subscriptions, tokens or VAPID keys.
  const rows = subscriptions ?? [];
  for (let i = 0; i < rows.length; i += 5) {
    await Promise.all(rows.slice(i, i + 5).map(async sub => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        }, payload, { TTL: 3600 });
        sent++;
      } catch (failure) {
        const status = (failure as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          const { error: cleanupError } = await db.from("push_subscriptions")
            .delete().eq("id", sub.id).eq("user_id", userId);
          if (cleanupError) {
            console.warn("[WEB PUSH] Expired endpoint cleanup failed", cleanupError.code);
          }
        } else {
          console.warn("[WEB PUSH] Delivery unavailable", status || "unknown");
        }
      }
    }));
  }
  return { ok: true, sent };
}

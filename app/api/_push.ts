import admin from "firebase-admin";
import webpush from "web-push";
import { createSupabaseAdmin } from "./_supabaseAdmin";

/**
 * Optional best-effort push transports. In-app notifications are persisted
 * separately and must never depend on VAPID or Firebase being configured.
 * Never log endpoints, Auth secrets, FCM tokens or subscription key material.
 */
function firebaseApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  if (admin.apps.length) return admin.app();
  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

export async function sendPushToUser({
  userId,
  title,
  message,
  url,
}: {
  userId: string;
  title: string;
  message: string;
  url?: string;
}) {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const vapidEnabled = Boolean(publicKey && privateKey);
  const fcmEnabled = Boolean(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  if (!vapidEnabled && !fcmEnabled) {
    return { ok: true, sent: 0, reason: "PUSH_NOT_CONFIGURED" };
  }

  const db = createSupabaseAdmin();
  let webSent = 0;
  let firebaseSent = 0;

  // This is the transport used by the Notification Center's "เปิด push"
  // control. It does not need Firebase, SMTP or a paid provider.
  if (vapidEnabled && publicKey && privateKey) {
    try {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT?.trim() || "mailto:admin@woffu.local",
        publicKey,
        privateKey
      );
      const { data, error } = await db
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", userId)
        .limit(30);
      if (error) {
        console.warn("[WEB PUSH] Subscription lookup failed", error.code);
      } else {
        for (const sub of data ?? []) {
          try {
            await webpush.sendNotification({
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            }, JSON.stringify({
              title, body: message, url: url || "/notifications",
              tag: "woffu-workflow",
            }), { TTL: 3600 });
            webSent++;
          } catch (failure) {
            const status = (failure as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              await db.from("push_subscriptions").delete()
                .eq("id", sub.id).eq("user_id", userId);
            } else {
              console.warn("[WEB PUSH] Delivery failed", status || "unknown");
            }
          }
        }
      }
    } catch {
      console.warn("[WEB PUSH] Configuration unavailable");
    }
  }

  // Optional legacy FCM devices. Skipped altogether if credentials are
  // missing, rather than throwing and obscuring a successful DB action.
  if (fcmEnabled) {
    try {
      const app = firebaseApp();
      if (app) {
        const { data, error } = await db.from("push_tokens")
          .select("token").eq("user_id", userId).limit(500);
        if (error) {
          console.warn("[FCM] Token lookup failed", error.code);
        } else {
          const tokens = (data ?? []).map(row => row.token).filter(Boolean);
          if (tokens.length) {
            const result = await app.messaging().sendEachForMulticast({
              tokens,
              notification: { title, body: message },
              data: { title, body: message, link: url || "/notifications" },
              webpush: {
                notification: { title, body: message, icon: "/icon-192.png" },
              },
            });
            firebaseSent = result.successCount;
            const invalid = result.responses.flatMap((response, i) => {
              const code = response.error?.code || "";
              return !response.success && (
                code.includes("registration-token-not-registered") ||
                code.includes("invalid-registration-token")
              ) ? [tokens[i]] : [];
            });
            if (invalid.length) {
              await db.from("push_tokens").delete()
                .eq("user_id", userId).in("token", invalid);
            }
          }
        }
      }
    } catch {
      console.warn("[FCM] Optional delivery unavailable");
    }
  }

  return { ok: true, sent: webSent + firebaseSent, webSent, firebaseSent };
}

import admin from "firebase-admin";
import { createSupabaseAdmin } from "./_supabaseAdmin";

function getFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  console.log("[FCM] FIREBASE_PROJECT_ID =", projectId);
  console.log("[FCM] FIREBASE_CLIENT_EMAIL =", clientEmail);
  console.log("[FCM] FIREBASE_PRIVATE_KEY exists =", !!privateKey);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing Firebase Admin env");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
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
  getFirebaseAdmin();

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) {
    console.error("[FCM] push_tokens query error:", error);
    throw new Error(error.message);
  }

  const tokens = (data ?? []).map((x: any) => x.token).filter(Boolean);

  console.log("[FCM] userId =", userId);
  console.log("[FCM] tokens found =", tokens.length);

  if (tokens.length === 0) {
    return { ok: true, sent: 0 };
  }

  const result = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title,
      body: message,
    },
    data: {
      title,
      body: message,
      link: url || "/",
    },
    webpush: {
      fcmOptions: {
        link: url || "/",
      },
      notification: {
        title,
        body: message,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
      },
    },
  });

  console.log("[FCM] successCount =", result.successCount);
  console.log("[FCM] failureCount =", result.failureCount);
  console.log(
    "[FCM] responses =",
    result.responses.map((r) => ({
      success: r.success,
      error: r.error ? String(r.error.message || r.error) : null,
      code: (r.error as any)?.code || null,
    }))
  );

  const invalidTokens: string[] = [];
  result.responses.forEach((r, i) => {
    if (!r.success) {
      const code = (r.error as any)?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        invalidTokens.push(tokens[i]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await supabase.from("push_tokens").delete().in("token", invalidTokens);
    console.log("[FCM] removed invalid tokens =", invalidTokens.length);
  }

  return { ok: true, sent: result.successCount };
}
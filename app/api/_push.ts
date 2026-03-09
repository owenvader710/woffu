import admin from "firebase-admin";
import { createSupabaseAdmin } from "./_supabaseAdmin";

function normalizeEnv(value?: string | null) {
  if (!value) return "";
  return value.trim();
}

function normalizePrivateKey(value?: string | null) {
  if (!value) return "";

  let key = value.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, "\n").trim();

  return key;
}

function getFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = normalizeEnv(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = normalizeEnv(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  console.log("[FIREBASE ENV CHECK]", {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    hasPrivateKey: !!privateKey,
    startsWithBegin: privateKey.startsWith("-----BEGIN PRIVATE KEY-----"),
    endsWithEnd: privateKey.endsWith("-----END PRIVATE KEY-----"),
    firstChar: privateKey[0] || null,
    lastChar: privateKey.slice(-1) || null,
  });

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

  console.log("[PUSH] incoming userId =", userId);

  const { data, error } = await supabase
    .from("push_tokens")
    .select("user_id, token, platform")
    .eq("user_id", userId);

  console.log("[PUSH] query error =", error);
  console.log("[PUSH] raw rows =", data);

  if (error) throw new Error(error.message);

  const tokens = (data ?? []).map((x: any) => x.token).filter(Boolean);

  console.log("[PUSH] tokens =", tokens);
  console.log("[PUSH] token count =", tokens.length);

  if (tokens.length === 0) {
    return { ok: true, sent: 0, reason: "NO_TOKEN" };
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

  console.log("[PUSH] successCount =", result.successCount);
  console.log("[PUSH] failureCount =", result.failureCount);
  console.log(
    "[PUSH] responses =",
    result.responses.map((r) => ({
      success: r.success,
      error: (r.error as any)?.code || (r.error as any)?.message || null,
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
  }

  return { ok: true, sent: result.successCount };
}
export async function sendPushToUser(params: {
  userId: string;
  title: string;
  message?: string;
  url?: string;
}) {
  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      "";

    if (!base) return;

    const normalizedBase = base.startsWith("http") ? base : `https://${base}`;

    await fetch(`${normalizedBase}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: params.userId,
        title: params.title,
        message: params.message || "",
        url: params.url || "/notifications",
      }),
    });
  } catch {
    // ignore
  }
}
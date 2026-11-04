/**
 * Parse untrusted team notice input before a service-role insert.
 * Links are kept as HTTPS only; upload endpoints should supply HTTPS storage URLs.
 */
export type NoticeInput = {
  title: string;
  content: string | null;
  notice_type: "GENERAL" | "URGENT" | "EVENT";
  attachment_url: string | null;
  attachment_name: string | null;
  is_pinned: boolean;
};

export function parseNoticeInput(value: unknown, canPin: boolean): NoticeInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.title !== "string" || (body.content != null && typeof body.content !== "string")) return null;
  const title = body.title.trim();
  const content = (body.content ?? "") as string;
  if (!title || title.length > 160 || content.length > 10000) return null;

  const rawType = typeof body.notice_type === "string" ? body.notice_type.trim().toUpperCase() : "";
  const notice_type: NoticeInput["notice_type"] =
    rawType === "URGENT" || rawType === "EVENT" ? rawType : "GENERAL";

  let attachment_url: string | null = null;
  if (body.attachment_url != null && body.attachment_url !== "") {
    if (typeof body.attachment_url !== "string" || body.attachment_url.length > 2048) return null;
    try {
      const url = new URL(body.attachment_url);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
      attachment_url = url.href;
    } catch {
      return null;
    }
  }

  let attachment_name: string | null = null;
  if (body.attachment_name != null && body.attachment_name !== "") {
    if (typeof body.attachment_name !== "string" || body.attachment_name.length > 255) return null;
    attachment_name = body.attachment_name.trim() || null;
  }
  if (attachment_name && !attachment_url) return null;
  return {
    title,
    content: content.trim() || null,
    notice_type,
    attachment_url,
    attachment_name,
    is_pinned: canPin && body.is_pinned === true,
  };
}

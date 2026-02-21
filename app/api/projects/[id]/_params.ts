// app/api/projects/[id]/_params.ts
import type { NextRequest } from "next/server";

type AnyContext = { params?: any };

export async function getIdFromContextOrPath(req: NextRequest, context?: AnyContext) {
  // 1) params from Next (object or Promise)
  const p = context?.params;
  if (p) {
    try {
      const maybePromise = p as any;
      const resolved = typeof maybePromise?.then === "function" ? await maybePromise : maybePromise;
      const id = resolved?.id;
      if (typeof id === "string" && id.length > 0) return id;
    } catch {
      // ignore -> fallback to path
    }
  }

  // 2) fallback parse from pathname: /api/projects/<id>/...
  const m = req.nextUrl.pathname.match(/\/api\/projects\/([^/]+)(?:\/|$)/);
  return m?.[1] || "";
}

export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}
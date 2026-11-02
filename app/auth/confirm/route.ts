import { NextRequest, NextResponse } from "next/server";
import { supabaseFromRequest } from "@/utils/supabase/api";

/**
 * Recover a Supabase session from:
 * - a PKCE auth code (Supabase default password-reset template), or
 * - token_hash + type=recovery (recommended cross-device custom template).
 *
 * Both paths always redirect to fixed in-app destinations. Never trust an
 * arbitrary next/redirect_to parameter from an incoming email link.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const { supabase, applyCookies } = supabaseFromRequest(req);
  let verified = false;

  if (tokenHash && /^[a-f0-9]{64}$/i.test(tokenHash) && type === "recovery") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    verified = !error;
  } else if (code && code.length < 4096) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  }

  const destination = new URL(
    verified ? "/reset-password" : "/forgot-password?error=invalid_link",
    url.origin
  );
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return applyCookies(response);
}

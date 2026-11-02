import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/app/api/_supabase";

type AllowedRole = "ADMIN" | "LEADER" | "MEMBER";

/**
 * Route-level authorization. RLS must also enforce row-level access in Supabase.
 * Never use the service-role client until this check has succeeded.
 */
export async function requireActiveUser(allowedRoles?: readonly AllowedRole[]) {
  const supabase = await createSupabaseServer();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      response: NextResponse.json({ error: "Failed to verify permissions" }, { status: 500 }),
    };
  }

  if (
    !profile ||
    profile.is_active !== true ||
    !["ADMIN", "LEADER", "MEMBER"].includes(profile.role) ||
    (allowedRoles && !allowedRoles.includes(profile.role as AllowedRole))
  ) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { supabase, user, profile };
}

export function requireActiveManager() {
  return requireActiveUser(["ADMIN", "LEADER"]);
}

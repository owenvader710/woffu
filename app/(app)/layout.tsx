// app/(app)/layout.tsx
import React from "react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import ClientShell from "./ClientShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email ?? null;

  return <ClientShell userEmail={email}>{children}</ClientShell>;
}
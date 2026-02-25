// app/(app)/layout.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  // ✅ ถ้าไม่ login ให้เด้งไป /login
  if (!data?.user) redirect("/login");

  return <>{children}</>;
}
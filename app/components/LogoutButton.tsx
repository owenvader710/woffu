"use client";

import { createBrowserClient } from "@supabase/ssr";

export default function LogoutButton() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={logout}
      className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100"
    >
      ออกจากระบบ
    </button>
  );
}

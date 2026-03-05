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
      className="w-full rounded-xl bg-[#e5ff78] tracking-tighter text-black py-2 font-semibold disabled:opacity-60"
    >
      Logout
    </button>
  );
}

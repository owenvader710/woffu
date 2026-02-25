// app/(app)/dashboard/layout.tsx
import Link from "next/link";
import LogoutButton from "../../components/LogoutButton";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-white/90 font-semibold">
            WOFFU
          </Link>

          <div className="flex items-center gap-3">
            {user?.email ? (
              <span className="text-sm text-white/60">{user.email}</span>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  );
}
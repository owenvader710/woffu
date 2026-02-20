import Link from "next/link";
import LogoutButton from "../components/LogoutButton";

async function getMe() {
  const res = await fetch("http://localhost:3000/api/me", {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const data = await getMe();
  const user = data?.user;

  return (
    <div className="min-h-screen bg-white">
      {/* Topbar */}
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold">
            WOFFU
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.email ?? "-"}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";
import LogoutButton from "../../components/LogoutButton";

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
    // 1. เปลี่ยน bg-white เป็น bg-black
    <div className="min-h-screen bg-black"> 
      {/* Topbar (ถ้ามี) */}

      {/* 2. จัดการส่วน Main Content */}
      {/* - ลบ mx-auto และ max-w-7xl ออกเพื่อให้พื้นหลังสีดำขยายเต็มพื้นที่ */}
      {/* - หรือถ้ายังอยากให้เนื้อหาอยู่ตรงกลางแต่พื้นหลังดำ ให้ขยับ bg-black ไปไว้ที่ div นอกสุด (ซึ่งเราทำแล้วในข้อ 1) */}
      <main className="w-full px-6 py-6">
        {children}
      </main>
    </div>
  );
}

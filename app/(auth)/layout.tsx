import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const previewReadOnly = process.env.VERCEL_ENV === "preview" &&
    process.env.WOFFU_ENABLE_PREVIEW_MUTATIONS !== "true";

  return (
    <div className="min-h-screen w-full bg-[#0e1011]">
      {previewReadOnly && (
        <aside role="status" className="mx-auto max-w-3xl px-4 pt-5">
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
            <strong className="block">WOFFU V2 Preview — โหมดตรวจดู</strong>
            ฐานข้อมูลของ Preview ยังไม่ยืนยันว่าแยกจาก Production
            ระบบจึงปิดคำสั่งส่งอีเมลรีเซ็ตและการเปลี่ยนรหัสผ่านไว้ชั่วคราว
            กรุณาอย่าใช้บัญชีงานจริงทดสอบจนกว่าจะเชื่อม Supabase Staging
          </div>
        </aside>
      )}
      {children}
    </div>
  );
}

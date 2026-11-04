import React from "react";
import { getDeploymentSafety } from "@/lib/stagingSafety";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const state = getDeploymentSafety(process.env);

  return (
    <div className="min-h-screen w-full bg-[#0e1011]">
      {state.readOnly && (
        <aside role="status" className="mx-auto max-w-3xl px-4 pt-5">
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
            <strong className="block">WOFFU V2 — โหมดทดสอบ</strong>
            {state.blockedDatabase
              ? "Preview ยังไม่ได้เชื่อมกับ Supabase Staging ที่แยกจาก Production ระบบจึงป้องกันการเข้าสู่ระบบและการเข้าถึงข้อมูลจริงไว้ก่อน"
              : "เชื่อม Supabase Staging แล้ว แต่ยังปิดการสร้างงานและรีเซ็ตรหัสผ่านจนกว่าจะอนุญาตให้ทดสอบการเขียนข้อมูล"}
          </div>
        </aside>
      )}
      {children}
    </div>
  );
}

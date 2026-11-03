"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

type SafetyMode = {
  readOnly: boolean;
  blockedDatabase: boolean;
  stagingConnected: boolean;
};

export default function PreviewSafetyBanner() {
  const [mode, setMode] = useState<SafetyMode | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/runtime-mode", { cache: "no-store", signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!controller.signal.aborted) setMode(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!mode?.readOnly) return null;
  return (
    <aside role="status" aria-label="สถานะระบบทดสอบ"
      className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 md:mx-6">
      <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <strong className="block text-sm">WOFFU V2 · โหมดทดสอบแบบอ่านอย่างเดียว</strong>
        {mode.blockedDatabase
          ? "เว็บไซต์นี้ยังไม่เชื่อม Supabase Staging ที่ได้รับการยืนยัน จึงปิดการเข้าถึงข้อมูลบัญชีและงานจริงเพื่อความปลอดภัย"
          : "เชื่อม Supabase Staging แล้ว แต่การเปลี่ยนข้อมูลและรีเซ็ตรหัสผ่านยังถูกปิดไว้ชั่วคราว"}
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export default function PreviewSafetyBanner() {
  const [readOnly, setReadOnly] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/runtime-mode", { cache: "no-store", signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!controller.signal.aborted) setReadOnly(data?.readOnly === true);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!readOnly) return null;
  return (
    <aside role="status" aria-label="สถานะระบบทดสอบ"
      className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 md:mx-6">
      <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true"/>
      <div>
        <strong className="block text-sm">WOFFU V2 Preview · โหมดตรวจดูเท่านั้น</strong>
        การสร้างงาน การส่ง Draft และการเปลี่ยนสถานะผ่าน API ถูกปิดไว้ชั่วคราว
        จนกว่าจะเชื่อม Supabase Staging แยกจาก Production
      </div>
    </aside>
  );
}

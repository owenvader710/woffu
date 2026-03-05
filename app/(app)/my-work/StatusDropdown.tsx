"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Status =
  | "TODO"
  | "IN_PROGRESS"
  // DB เดิม
  | "DONE"
  | "CANCELLED"
  // UI ใหม่
  | "COMPLETED"
  | "BLOCKED";

type Props = {
  value: Status;
  onChange: (s: Status) => void;
  disabled?: boolean;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function StatusDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // ตำแหน่งของเมนู (fixed) เพื่อให้ไม่โดน overflow ของตารางตัด
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 176,
  });

  // ✅ เมนูที่ต้องการให้เลือก (เฉพาะหน้า My Work)
  const options: Status[] = useMemo(
    () => ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"],
    []
  );

  const label = value; // หน้า my-work ใช้ label ตรง ๆ (mapping ทำที่ page.tsx)

  const syncPos = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();

    // เมนูชิดขวาปุ่ม + ลงมาเล็กน้อย
    const menuWidth = Math.max(176, r.width);
    const left = Math.max(8, r.right - menuWidth);
    const top = r.bottom + 8;

    setPos({ top, left, width: menuWidth });
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncPos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ปิดเมื่อคลิกนอก + รีโพซิชันเมื่อ scroll/resize
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const btn = btnRef.current;
      const target = e.target as Node | null;
      if (!btn || !target) return;

      // ถ้าคลิกที่ปุ่มเอง ให้ปล่อยให้ toggle ทำงาน
      if (btn.contains(target)) return;

      // ถ้าคลิกที่เมนู (portal) จะมี data-attr ช่วยเช็ค
      const el = (e.target as HTMLElement | null)?.closest?.("[data-status-menu='1']");
      if (el) return;

      setOpen(false);
    };

    const onScrollOrResize = () => {
      syncPos();
    };

    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    window.addEventListener("scroll", onScrollOrResize, { passive: true, capture: true });

    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onScrollOrResize as any);
      window.removeEventListener("scroll", onScrollOrResize as any, true as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold transition",
          "border-white/10 bg-black/20 text-white/85 hover:bg-white/10",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {label}
        <span className={cn("text-white/60 transition", open ? "rotate-180" : "")}>▾</span>
      </button>

      {/* ✅ Portal menu: ไม่โดน overflow ของตาราง/กรอบตัดแน่นอน */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-status-menu="1"
            className="fixed z-[9999]"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            <div className="rounded-2xl border border-white/10 bg-black/90 p-2 shadow-2xl backdrop-blur">
              {options.map((s) => {
                const active = s === value;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (s !== value) onChange(s);
                    }}
                    className={cn(
                      "w-full rounded-xl px-3 py-2 text-left text-xs font-extrabold transition",
                      active ? "bg-white text-black" : "text-white/80 hover:bg-white/10"
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
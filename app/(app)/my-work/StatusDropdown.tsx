"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Status = "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const OPTIONS: Array<{ value: Status; label: string }> = [
  { value: "TODO", label: "TODO" },
  { value: "IN_PROGRESS", label: "IN_PROGRESS" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "BLOCKED", label: "BLOCKED" },
];

export default function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: Status;
  onChange: (next: Status) => void | Promise<void>;
  disabled?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });

  useEffect(() => setMounted(true), []);

  const currentLabel = useMemo(() => {
    return OPTIONS.find((o) => o.value === value)?.label ?? value;
  }, [value]);

  function calcPos() {
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const width = Math.max(220, r.width); // กว้างขั้นต่ำให้สวย
    const gap = 8;

    // วาง dropdown “ใต้ปุ่ม” และกันหลุดจอ
    let left = r.right - width;
    if (left < 12) left = 12;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - 12 - width;

    let top = r.bottom + gap;
    // ถ้าพื้นที่ด้านล่างไม่พอ ลองเด้งขึ้นด้านบน
    const panelH = 240;
    if (top + panelH > window.innerHeight - 12) {
      top = Math.max(12, r.top - gap - panelH);
    }

    setPos({ top, left, width });
  }

  useLayoutEffect(() => {
    if (!open) return;
    calcPos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onWin = () => calcPos();

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true); // สำคัญ: scroll ใน container ก็ยังอัปเดตตำแหน่ง

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function pick(next: Status) {
    setOpen(false);
    await onChange(next);
  }

  const panel = (
    <div
      ref={panelRef}
      className="fixed z-[9999] rounded-2xl border border-white/10 bg-[#0b0b0b] text-white shadow-[0_25px_80px_rgba(0,0,0,0.7)]"
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      <div className="px-4 py-3 text-xs font-semibold tracking-widest text-white/45">CHANGE STATUS</div>
      <div className="h-px bg-white/10" />

      <div className="p-2">
        {OPTIONS.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => pick(o.value)}
              className={cn(
                "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
                active ? "bg-white text-black" : "text-white/85 hover:bg-white/10"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-extrabold text-white/85 hover:bg-white/10",
          disabled ? "opacity-60 pointer-events-none" : ""
        )}
      >
        {currentLabel}
        <span className="text-white/60">▾</span>
      </button>

      {mounted && open ? createPortal(panel, document.body) : null}
    </>
  );
}
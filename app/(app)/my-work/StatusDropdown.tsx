"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Status = "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const OPTIONS: Status[] = ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"];

export default function StatusDropdown({
  value,
  onChange,
}: {
  value: Status;
  onChange: (s: Status) => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 180 });

  const label = value;

  const activeIndex = useMemo(() => OPTIONS.findIndex((x) => x === value), [value]);

  function calcPos() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: Math.min(r.left, window.innerWidth - 260),
      width: Math.max(180, r.width),
    });
  }

  useEffect(() => {
    if (!open) return;
    calcPos();

    const onResize = () => calcPos();
    const onScroll = () => calcPos(); // รวมทั้ง scroll ใน container
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu = open ? (
    <>
      {/* overlay */}
      <div
        className="fixed inset-0 z-[9998]"
        onMouseDown={() => setOpen(false)}
      />
      {/* menu */}
      <div
        className="fixed z-[9999] rounded-2xl border border-white/10 bg-[#0b0b0b] p-2 shadow-[0_25px_80px_rgba(0,0,0,0.75)]"
        style={{ top: pos.top, left: pos.left, width: 240 }}
      >
        <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-white/40">
          CHANGE STATUS
        </div>

        <div className="flex flex-col gap-1">
          {OPTIONS.map((s, i) => {
            const active = i === activeIndex;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange(s);
                }}
                className={cn(
                  "w-full rounded-xl border px-3 py-2 text-left text-xs font-extrabold transition",
                  active
                    ? "border-white/10 bg-white text-black"
                    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </>
  ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-extrabold text-white/85 hover:bg-white/10"
      >
        {label}
        <span className="text-white/60">▾</span>
      </button>

      {/* ✅ Portal ไป body กันจม/กันโดน overflow ตัด */}
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
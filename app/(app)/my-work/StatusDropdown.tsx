"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type Status = "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function useOutsideClick(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

export default function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: Status;
  onChange: (s: Status) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useOutsideClick(rootRef, () => setOpen(false));

  const options: Status[] = ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"];

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-extrabold text-white/90 hover:bg-white/10",
          disabled ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        {value}
        <ChevronDown size={14} className={cn("transition", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        // ✅ ใช้ fixed + z สูง เพื่อไม่ “จมในกรอบ” ไม่โดน overflow ตัด
        <div
          className="fixed z-[9999] mt-2 w-56 rounded-2xl border border-white/10 bg-[#0b0b0b] p-1 shadow-[0_30px_120px_rgba(0,0,0,0.75)]"
          style={(() => {
            const r = rootRef.current?.getBoundingClientRect();
            if (!r) return {};
            return {
              left: r.left,
              top: r.bottom + 8,
            } as React.CSSProperties;
          })()}
        >
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
                  "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/10",
                  active ? "bg-white/10" : ""
                )}
              >
                <span className="font-semibold">{s}</span>
                {active ? <span className="text-xs text-white/45">current</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
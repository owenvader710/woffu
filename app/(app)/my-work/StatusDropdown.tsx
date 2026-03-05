"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type Status = "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
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
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const options = useMemo(() => ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"] as const, []);

  function updatePos() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: r.right,
      width: Math.max(200, r.width),
    });
  }

  useEffect(() => {
    if (!open) return;
    updatePos();

    const onResize = () => updatePos();
    const onScroll = () => updatePos();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-extrabold text-white/90 hover:bg-white/10",
          disabled ? "cursor-not-allowed opacity-50 hover:bg-black/30" : ""
        )}
      >
        {value}
        <ChevronDown size={14} className={cn("transition", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <button
          type="button"
          aria-label="close"
          className="fixed inset-0 z-[9998] cursor-default"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {open ? (
        <div
          className="fixed z-[9999] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_30px_120px_rgba(0,0,0,0.75)]"
          style={{
            top: pos.top,
            left: Math.max(12, pos.left - pos.width),
            width: pos.width,
          }}
        >
          <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-white/45">CHANGE STATUS</div>
          <div className="h-px bg-white/10" />
          <div className="p-2">
            {options.map((s) => {
              const active = value === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-extrabold transition",
                    active ? "bg-white text-black" : "text-white/85 hover:bg-white/10"
                  )}
                >
                  <span>{s}</span>
                  {active ? <span className="text-[10px] font-black">CURRENT</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
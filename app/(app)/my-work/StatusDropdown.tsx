"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Status = "TODO" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, onOutside]);
}

export default function StatusDropdown({
  value,
  onChange,
  disabled = false,
}: {
  value: Status;
  onChange: (v: Status) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useOutsideClick(rootRef as React.RefObject<HTMLElement | null>, () => setOpen(false));

  const options: Status[] = ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"];

  const pos = useMemo(() => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return null;
    return { left: b.left, top: b.bottom + 8, width: b.width };
  }, [open]);

  return (
    <div ref={rootRef} className="inline-block">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-xs font-extrabold transition",
          disabled
            ? "border-white/10 bg-white/5 text-white/40 cursor-not-allowed"
            : "border-white/10 bg-black/30 text-white/85 hover:bg-white/10"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {value}
        <span className="text-white/60">▾</span>
      </button>

      {open && pos
        ? createPortal(
            <div
              className="fixed z-[9999]"
              style={{ left: pos.left, top: pos.top, minWidth: Math.max(220, pos.width) }}
            >
              <div className="rounded-2xl border border-white/10 bg-black/90 p-2 shadow-[0_25px_80px_rgba(0,0,0,0.65)] backdrop-blur">
                <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-white/45">
                  CHANGE STATUS
                </div>

                <div className="mt-1 space-y-1">
                  {options.map((s) => {
                    const active = s === value;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onChange(s);
                        }}
                        className={cn(
                          "w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition",
                          active ? "bg-white text-black" : "text-white/85 hover:bg-white/10"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
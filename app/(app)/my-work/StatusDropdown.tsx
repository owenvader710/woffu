"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
      if (el.contains(e.target as Node)) return;
      onOutside();
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
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useOutsideClick(rootRef as unknown as React.RefObject<HTMLElement>, () => setOpen(false));

  const options: Status[] = ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"];

  useEffect(() => {
    if (!open) return;

    const btn = btnRef.current;
    if (!btn) return;

    const r = btn.getBoundingClientRect();

    // fixed positioning (ไม่โดน overflow ของ table)
    setPos({
      top: r.bottom + 8,
      left: Math.min(r.left, window.innerWidth - Math.max(260, r.width) - 12),
      width: Math.max(260, r.width),
    });
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs font-extrabold text-white/90",
          disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white/10"
        )}
        aria-disabled={disabled ? "true" : "false"}
        disabled={disabled}
      >
        {value}
        <ChevronDown size={14} className={cn("transition", open ? "rotate-180" : "")} />
      </button>

      {open && pos
        ? createPortal(
            <div
              className="fixed z-[9999] overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="p-2">
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
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-extrabold",
                        active ? "bg-white text-black" : "text-white/85 hover:bg-white/10"
                      )}
                    >
                      <span>{s}</span>
                      {active ? <span className="text-[10px] font-black opacity-70">CURRENT</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
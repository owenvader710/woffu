"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type Status = "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED";

const STATUS_ORDER: Status[] = ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function statusStyle(s: Status) {
  // pill look + color
  if (s === "TODO")
    return "border-white/15 bg-white/5 text-white/80 hover:bg-white/10";
  if (s === "IN_PROGRESS")
    return "border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/15";
  if (s === "BLOCKED")
    return "border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15";
  return "border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/15";
}

export default function StatusDropdown({
  value,
  disabled,
  onChange,
}: {
  value: Status;
  disabled?: boolean;
  onChange: (next: Status) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => STATUS_ORDER, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={rootRef} className="relative inline-flex justify-end">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
          "transition outline-none",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
          statusStyle(value)
        )}
      >
        <span>{value}</span>
        <span className={cn("text-[10px] opacity-80 transition", open ? "rotate-180" : "")}>
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl shadow-2xl">
          <div className="p-2">
            {options.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  if (s !== value) onChange(s);
                }}
                className={cn(
                  "mb-2 last:mb-0 w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold",
                  "transition",
                  statusStyle(s),
                  s === value ? "ring-1 ring-white/15" : ""
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
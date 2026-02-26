"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type Status = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "CANCELLED";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const STATUS_LABEL: Record<Status, string> = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW: "REVIEW",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
};

export default function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: Status;
  onChange: (s: Status) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => Object.keys(STATUS_LABEL) as Status[], []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-extrabold",
          "border-blue-500/25 bg-blue-500/10 text-blue-100 hover:bg-blue-500/15",
          disabled ? "opacity-60 cursor-not-allowed" : ""
        )}
      >
        {STATUS_LABEL[value]}
        <ChevronDown size={16} className={cn("opacity-80 transition", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] shadow-[0_25px_80px_rgba(0,0,0,0.75)]">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-widest text-white/45">
            CHANGE STATUS
          </div>
          <div className="h-px bg-white/10" />

          <div className="p-2">
            {options.map((s) => {
              const active = s === value;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={async () => {
                    setOpen(false);
                    await onChange(s);
                  }}
                  className={cn(
                    "w-full rounded-xl px-3 py-2 text-left text-sm",
                    active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5"
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
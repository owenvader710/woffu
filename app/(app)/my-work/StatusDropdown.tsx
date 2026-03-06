"use client";

import React, { useEffect, useRef, useState } from "react";

export type Status =
  | "PRE_ORDER"
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED";

const STATUS_OPTIONS: Status[] = [
  "PRE_ORDER",
  "TODO",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
];

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function StatusDropdown({
  value,
  onChange,
  disabled = false,
}: {
  value: Status;
  onChange: (next: Status) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={cn(
          "inline-flex min-w-[168px] items-center justify-between rounded-2xl border px-4 py-2 text-sm font-extrabold transition",
          disabled
            ? "cursor-not-allowed border-white/10 bg-white/5 text-white/40"
            : "border-white/10 bg-black/30 text-white/85 hover:bg-white/10"
        )}
      >
        <span>{value}</span>
        <span className="ml-3 text-xs text-white/45">▼</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <div className="p-2">
            {STATUS_OPTIONS.map((status) => {
              const isActive = status === value;
              const isDisabled = status === "PRE_ORDER";

              return (
                <button
                  key={status}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) return;
                    onChange(status);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition",
                    isActive
                      ? "bg-white text-black"
                      : "text-white/85 hover:bg-white/10",
                    isDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
                  )}
                >
                  <span>{status}</span>
                  {isDisabled ? (
                    <span className="text-[10px] font-extrabold tracking-wide text-white/40">
                      AUTO
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type Status =
  | "PRE_ORDER"
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED";

type Props = {
  value: Status;
  onChange: (next: Status) => void;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const OPTIONS: Array<{
  value: Status;
  label: string;
  disabled?: boolean;
  note?: string;
}> = [
  { value: "PRE_ORDER", label: "PRE_ORDER", note: "AUTO" },
  { value: "TODO", label: "TODO" },
  { value: "IN_PROGRESS", label: "IN_PROGRESS" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "BLOCKED", label: "BLOCKED" },
];

export default function StatusDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const current = useMemo(
    () => OPTIONS.find((x) => x.value === value) ?? OPTIONS[0],
    [value]
  );

  function updateMenuPosition() {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuWidth = 220;
    const gap = 8;

    let left = rect.right - menuWidth;
    let top = rect.bottom + gap;

    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

    const estimatedHeight = 260;
    if (top + estimatedHeight > window.innerHeight - 12) {
      top = rect.top - estimatedHeight - gap;
    }
    if (top < 12) top = 12;

    setMenuStyle({
      position: "fixed",
      top,
      left,
      width: menuWidth,
      zIndex: 99999,
    });
  }

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const onResize = () => updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => updateMenuPosition());
    return () => window.cancelAnimationFrame(id);
  }, [open, value]);

  return (
    <>
      <div ref={wrapRef} className="relative inline-block text-left">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-w-[170px] items-center justify-between rounded-[18px] border border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:bg-white/10"
        >
          <span>{current.label}</span>
          <span className="ml-4 text-xs text-[#9eb3d1]">▼</span>
        </button>
      </div>

      {open ? (
        <div
          ref={menuRef}
          style={menuStyle}
          className="rounded-[20px] border border-white/10 bg-[#0a0a0a] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.58)]"
        >
          <div className="space-y-2">
            {OPTIONS.map((opt) => {
              const active = opt.value === value;

              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    setOpen(false);
                    if (opt.value !== value) onChange(opt.value);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-extrabold transition",
                    active
                      ? "bg-white text-black"
                      : "bg-white/5 text-white hover:bg-white/10",
                    opt.disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.note ? (
                    <span className="ml-4 text-[11px] font-black tracking-widest text-white/35">
                      {opt.note}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
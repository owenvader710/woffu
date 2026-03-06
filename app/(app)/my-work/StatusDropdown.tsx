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

export default function StatusDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    return [
      {
        value: "PRE_ORDER" as Status,
        label: "PRE_ORDER",
        note: "AUTO",
        disabled: true,
      },
      {
        value: "TODO" as Status,
        label: "TODO",
      },
      {
        value: "IN_PROGRESS" as Status,
        label: "IN_PROGRESS",
      },
      {
        value: "COMPLETED" as Status,
        label: "COMPLETED",
      },
      {
        value: "BLOCKED" as Status,
        label: "BLOCKED",
      },
    ];
  }, []);

  const current = useMemo(
    () => options.find((x) => x.value === value) ?? options[0],
    [options, value]
  );

  function updateMenuPosition() {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuWidth = 240;
    const gap = 8;
    const estimatedHeight = 320;

    let left = rect.right - menuWidth;
    let top = rect.bottom + gap;

    if (left < 12) left = 12;
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }

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
          className="inline-flex min-w-[170px] items-center justify-between rounded-[18px] border border-white/35 bg-[linear-gradient(180deg,#3a3a3a,#202020)] px-5 py-3 text-sm font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:brightness-110"
        >
          <span>{current.label}</span>
          <span className="ml-4 text-xs text-[#9eb3d1]">▼</span>
        </button>
      </div>

      {open ? (
        <div
          ref={menuRef}
          style={menuStyle}
          className="rounded-[22px] border border-white/10 bg-[#0b0b0b] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.60)]"
        >
          <div className="space-y-2">
            {options.map((opt) => {
              const active = opt.value === value;
              const disabled = !!opt.disabled;

              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setOpen(false);
                    if (opt.value !== value) onChange(opt.value);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-extrabold transition",
                    active
                      ? "bg-white text-black"
                      : disabled
                        ? "bg-white/5 text-white/35"
                        : "bg-[#171717] text-white hover:bg-[#222222]",
                    disabled && "cursor-not-allowed"
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.note ? (
                    <span
                      className={cn(
                        "ml-4 text-[11px] font-black tracking-widest",
                        disabled ? "text-white/25" : "text-white/35"
                      )}
                    >
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
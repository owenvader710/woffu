"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const options = useMemo(() => {
    return [
      { value: "PRE_ORDER" as Status, label: "PRE_ORDER", note: "AUTO", disabled: true },
      { value: "TODO" as Status, label: "TODO" },
      { value: "IN_PROGRESS" as Status, label: "IN_PROGRESS" },
      { value: "COMPLETED" as Status, label: "COMPLETED" },
      { value: "BLOCKED" as Status, label: "BLOCKED" },
    ];
  }, []);

  const current = useMemo(
    () => options.find((x) => x.value === value) ?? options[0],
    [options, value]
  );

  function updateMenuPosition() {
    const btn = buttonRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const rect = btn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth < 640;

    const horizontalPadding = 12;
    const gap = 8;

    const preferredWidth = isMobile
      ? Math.min(Math.max(rect.width, 190), viewportWidth - horizontalPadding * 2)
      : 220;

    const menuHeight = menu.offsetHeight || 260;

    let left = isMobile ? rect.left : rect.right - preferredWidth;

    if (left < horizontalPadding) left = horizontalPadding;
    if (left + preferredWidth > viewportWidth - horizontalPadding) {
      left = viewportWidth - preferredWidth - horizontalPadding;
    }

    const hasSpaceBelow = rect.bottom + gap + menuHeight <= window.innerHeight - 12;
    const top = hasSpaceBelow
      ? rect.bottom + gap
      : Math.max(12, rect.top - menuHeight - gap);

    setMenuStyle({
      position: "fixed",
      top,
      left,
      width: preferredWidth,
      zIndex: 99999,
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const onResize = () => updateMenuPosition();
    const onScroll = () => updateMenuPosition();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
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

  const menu = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="rounded-[18px] border border-white/10 bg-[#0b0b0b] p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.60)]"
    >
      <div className="space-y-1.5">
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
                "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-extrabold transition",
                active
                  ? "bg-white text-black"
                  : disabled
                    ? "cursor-not-allowed bg-white/5 text-white/35"
                    : "bg-[#171717] text-white hover:bg-[#222222]"
              )}
            >
              <span className="min-w-0 break-words">{opt.label}</span>
              {opt.note ? (
                <span className="ml-3 shrink-0 text-[10px] font-black tracking-widest text-white/25">
                  {opt.note}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div ref={wrapRef} className="relative inline-block w-full text-left sm:w-auto">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex w-full min-w-0 items-center justify-between rounded-[14px] border border-white/30 bg-[linear-gradient(180deg,#353535,#1f1f1f)] px-3.5 py-2.5 text-[13px] font-extrabold text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition hover:brightness-110 sm:min-w-[160px] sm:px-4"
        >
          <span className="truncate">{current.label}</span>
          <span className="ml-3 shrink-0 text-[10px] text-[#9eb3d1]">▼</span>
        </button>
      </div>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
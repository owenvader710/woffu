"use client";

import React from "react";

export default function PageShell({
  title,
  subtitle,
  right,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-semibold tracking-widest text-white/50">WOFFU</div>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">{title}</h1>
          {subtitle ? <div className="mt-2 text-sm text-white/60">{subtitle}</div> : null}
        </div>

        {right ? <div className="flex gap-2">{right}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
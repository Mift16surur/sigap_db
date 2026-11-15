"use client";

import React from "react";

export function PageHeader({
  title,
  description,
  badge,
  actions,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-[#17243b]">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-[#2457d6]">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs lg:text-sm text-[#64748b] leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {children}
    </div>
  );
}


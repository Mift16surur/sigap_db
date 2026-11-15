import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "border-transparent bg-[#2457d6] text-white hover:bg-blue-700",
    secondary: "border-transparent bg-[#edf2f8] text-[#17243b]",
    destructive: "border-transparent bg-[#dc4c4c] text-white",
    outline: "text-[#64748b] border-[#e2e8f0]",
    success: "border-transparent bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "border-transparent bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}


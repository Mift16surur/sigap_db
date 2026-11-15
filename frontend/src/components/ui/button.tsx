"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0.5rem] text-xs font-semibold ring-offset-white transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default: "bg-[#2457d6] text-white hover:bg-blue-700 shadow-xs",
      secondary: "bg-[#edf2f8] text-[#17243b] hover:bg-slate-200",
      outline:
        "border border-[#e2e8f0] bg-white text-[#17243b] hover:bg-[#edf2f8] shadow-2xs",
      destructive: "bg-[#dc4c4c] text-white hover:bg-red-700 shadow-xs",
      ghost: "text-[#64748b] hover:bg-[#edf2f8] hover:text-[#17243b]",
      link: "text-[#2457d6] underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-9 px-4 py-2",
      sm: "h-8 px-3 text-[11px]",
      lg: "h-10 px-5 text-sm",
      icon: "h-8 w-8 p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";


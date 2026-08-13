import React from "react";

interface LogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function Logo({ className = "", size = "sm" }: LogoProps) {
  const dimensions = {
    xs: "h-5 w-5 text-[9px] rounded-sm",
    sm: "h-6 w-6 text-[10px] rounded-md",
    md: "h-7 w-7 text-xs rounded-lg",
    lg: "h-8 w-8 text-sm rounded-xl",
    xl: "h-10 w-10 text-base rounded-xl",
  };

  return (
    <div
      className={`flex items-center justify-center bg-[#2D2D2D] text-[#FAF8F5] font-serif font-bold select-none shrink-0 ${dimensions[size]} ${className}`}
    >
      S
    </div>
  );
}

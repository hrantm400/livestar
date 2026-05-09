"use client";

import { CATEGORY_GRADIENTS, Category } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials: string;
  category: Category;
  online?: boolean;
  size?: number;
  className?: string;
}

export default function Avatar({ initials, category, online, size = 44, className }: AvatarProps) {
  return (
    <div
      className={cn("relative shrink-0 rounded-full grid place-items-center text-white font-bold shadow-lg", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: CATEGORY_GRADIENTS[category],
        boxShadow: "0 6px 18px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      <span className="drop-shadow-sm">{initials}</span>
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-emerald-400"
          style={{
            width: size * 0.27,
            height: size * 0.27,
            border: "2px solid #0c0c14",
            boxShadow: "0 0 8px rgba(34,197,94,0.7)",
          }}
        />
      )}
    </div>
  );
}

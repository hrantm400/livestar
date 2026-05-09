"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/store";

export default function KeyboardLayer() {
  const togglePalette = useUI((s) => s.togglePalette);
  const select = useUI((s) => s.select);
  const selectedId = useUI((s) => s.selectedId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        togglePalette(true);
        return;
      }
      if (e.key === "Escape" && selectedId && !isTyping) {
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette, select, selectedId]);

  return null;
}

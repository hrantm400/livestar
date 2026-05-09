"use client";

import { motion } from "framer-motion";
import { useUI, CategoryFilter, WhenFilter } from "@/lib/store";
import { CATEGORY_COLORS, CATEGORY_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: CategoryFilter; label: string; color?: string }[] = [
  { id: "all", label: "All" },
  { id: "music", label: CATEGORY_LABEL.music, color: CATEGORY_COLORS.music },
  { id: "film", label: CATEGORY_LABEL.film, color: CATEGORY_COLORS.film },
  { id: "sports", label: CATEGORY_LABEL.sports, color: CATEGORY_COLORS.sports },
  { id: "business", label: CATEGORY_LABEL.business, color: CATEGORY_COLORS.business },
  { id: "fashion", label: CATEGORY_LABEL.fashion, color: CATEGORY_COLORS.fashion },
];

const WHENS: { id: WhenFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "past", label: "Past" },
  { id: "now", label: "Now" },
  { id: "soon", label: "Upcoming" },
];

export default function FilterBar() {
  const category = useUI((s) => s.category);
  const setCategory = useUI((s) => s.setCategory);
  const when = useUI((s) => s.when);
  const setWhen = useUI((s) => s.setWhen);

  return (
    <footer
      className="glass relative flex items-center gap-5 px-5 rounded-xl overflow-hidden"
      style={{ gridArea: "footer" }}
    >
      <div className="label-eyebrow shrink-0 hidden md:block">Categories</div>

      <div className="flex gap-0.5 flex-1 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "relative px-3 h-7 rounded-md text-[12px] whitespace-nowrap transition-colors flex items-center gap-1.5 tracking-[-0.005em]",
                active
                  ? "text-ink-0 font-medium"
                  : "text-ink-3 hover:text-ink-1 font-normal"
              )}
            >
              {c.color && (
                <span
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: c.color,
                    opacity: active ? 1 : 0.5,
                  }}
                />
              )}
              <span className="relative">{c.label}</span>
              {active && (
                <motion.span
                  layoutId="cat-underline"
                  className="absolute -bottom-2 left-2 right-2 h-px bg-accent"
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="h-6 w-px bg-line-1 shrink-0" />

      <div className="label-eyebrow shrink-0 hidden md:block">Window</div>

      <div className="flex bg-bg-2/60 border border-line-1 rounded-md p-0.5 gap-px shrink-0">
        {WHENS.map((w) => {
          const active = when === w.id;
          return (
            <button
              key={w.id}
              onClick={() => setWhen(w.id)}
              className={cn(
                "relative px-2.5 h-6 rounded text-[10px] uppercase font-mono tracking-[0.16em] transition-colors",
                active ? "text-bg-0" : "text-ink-3 hover:text-ink-1"
              )}
            >
              {active && (
                <motion.div
                  layoutId="when-pill"
                  className="absolute inset-0 rounded bg-accent"
                  transition={{ type: "spring", duration: 0.35 }}
                />
              )}
              <span className="relative">{w.label}</span>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:block font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4 shrink-0">
        Public sources only
      </div>
    </footer>
  );
}

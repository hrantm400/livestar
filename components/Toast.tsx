"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, AlertCircle, X } from "lucide-react";
import { create } from "zustand";
import { useEffect } from "react";

export type ToastVariant = "success" | "info" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  ttl: number;
}

interface ToastStore {
  items: ToastItem[];
  push: (msg: string, variant?: ToastVariant, ttl?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (message, variant = "info", ttl = 3200) =>
    set((s) => ({ items: [...s.items, { id: nextId++, message, variant, ttl }] })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

/** Imperative API: `toast("Saved")` from anywhere. */
export function toast(message: string, variant: ToastVariant = "info", ttl = 3200) {
  useToastStore.getState().push(message, variant, ttl);
}

const ICONS = {
  success: Check,
  info: Info,
  error: AlertCircle,
} as const;

const ACCENTS = {
  success: { ring: "border-emerald-400/40", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  info: { ring: "border-accent/40", bg: "bg-accent/10", text: "text-accent" },
  error: { ring: "border-red-500/40", bg: "bg-red-500/10", text: "text-red-400" },
} as const;

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  // Auto-dismiss
  useEffect(() => {
    const timers = items.map((t) => setTimeout(() => dismiss(t.id), t.ttl));
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [items, dismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = ICONS[t.variant];
          const a = ACCENTS[t.variant];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", duration: 0.3, bounce: 0.25 }}
              className={`pointer-events-auto glass-strong rounded-full pl-3 pr-2 py-2 flex items-center gap-2.5 border ${a.ring} shadow-2xl`}
              style={{ boxShadow: "0 18px 40px rgba(0,0,0,0.5)" }}
            >
              <span className={`grid place-items-center w-5 h-5 rounded-full ${a.bg} ${a.text}`}>
                <Icon size={11} />
              </span>
              <span className="text-[12px] text-ink-0 font-medium">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink-3 hover:text-ink-0 ml-1 -mr-0.5"
                aria-label="Dismiss"
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ActivityEvent, Celebrity } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function relTime(iso: string, anchor: Date = new Date()): string {
  const t = new Date(iso).getTime();
  const diffMin = Math.round((t - anchor.getTime()) / 60_000);
  const abs = Math.abs(diffMin);

  const fmt = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  if (diffMin < 0) {
    if (abs < 1) return "just now";
    if (abs < 60) return `${fmt(abs, "min")} ago`;
    if (abs < 60 * 24) return `${fmt(Math.round(abs / 60), "hour")} ago`;
    if (abs < 60 * 24 * 14) return `${fmt(Math.round(abs / (60 * 24)), "day")} ago`;
    return `${Math.round(abs / (60 * 24 * 7))}w ago`;
  } else {
    if (abs < 1) return "now";
    if (abs < 60) return `in ${fmt(abs, "min")}`;
    if (abs < 60 * 24) return `in ${fmt(Math.round(abs / 60), "hour")}`;
    if (abs < 60 * 24 * 2) return "tomorrow";
    if (abs < 60 * 24 * 14) return `in ${fmt(Math.round(abs / (60 * 24)), "day")}`;
    return `in ${Math.round(abs / (60 * 24 * 7))}w`;
  }
}

export function lastSeen(c: Celebrity): ActivityEvent | undefined {
  return (
    c.events.find((e) => e.type === "now") ||
    c.events.find((e) => e.type === "past")
  );
}

export function nextUp(c: Celebrity): ActivityEvent | undefined {
  return c.events.find((e) => e.type === "soon");
}

export function fuzzyMatch(query: string, ...fields: string[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f.toLowerCase().includes(q));
}

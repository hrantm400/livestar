"use client";

import { create } from "zustand";
import { Category, EventType } from "./types";

export type WhenFilter = EventType | "all";
export type CategoryFilter = Category | "all";
export type MapMode = "pins" | "heatmap" | "globe";

interface UIState {
  selectedId: string | null;
  category: CategoryFilter;
  when: WhenFilter;
  search: string;
  mapMode: MapMode;
  paletteOpen: boolean;
  flyTarget: { lng: number; lat: number; zoom?: number } | null;

  select: (id: string | null) => void;
  setCategory: (c: CategoryFilter) => void;
  setWhen: (w: WhenFilter) => void;
  setSearch: (q: string) => void;
  setMapMode: (m: MapMode) => void;
  togglePalette: (open?: boolean) => void;
  flyTo: (target: { lng: number; lat: number; zoom?: number } | null) => void;
}

export const useUI = create<UIState>((set) => ({
  selectedId: null,
  category: "all",
  when: "all",
  search: "",
  mapMode: "pins",
  paletteOpen: false,
  flyTarget: null,

  select: (id) => set({ selectedId: id }),
  setCategory: (c) => set({ category: c }),
  setWhen: (w) => set({ when: w }),
  setSearch: (q) => set({ search: q }),
  setMapMode: (m) => set({ mapMode: m }),
  togglePalette: (open) =>
    set((s) => ({ paletteOpen: open === undefined ? !s.paletteOpen : open })),
  flyTo: (t) => set({ flyTarget: t }),
}));

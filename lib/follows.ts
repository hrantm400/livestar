"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "stellar.follows.v1";

type Listener = () => void;

class FollowStore {
  private set: Set<string> = new Set();
  private listeners = new Set<Listener>();
  private hydrated = false;

  hydrate() {
    if (this.hydrated || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) this.set = new Set(arr.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      /* ignore corrupt storage */
    }
    this.hydrated = true;
    // cross-tab sync
    window.addEventListener("storage", (e) => {
      if (e.key !== KEY) return;
      try {
        const arr = e.newValue ? (JSON.parse(e.newValue) as string[]) : [];
        this.set = new Set(arr);
        this.emit();
      } catch {
        /* ignore */
      }
    });
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.set]));
    } catch {
      /* quota / private mode */
    }
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  has(id: string) {
    return this.set.has(id);
  }

  list() {
    return this.set;
  }

  toggle(id: string): boolean {
    if (this.set.has(id)) {
      this.set.delete(id);
    } else {
      this.set.add(id);
    }
    this.persist();
    this.emit();
    return this.set.has(id);
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
}

const store = new FollowStore();

function getSnapshot(): Set<string> {
  return store.list();
}

function subscribe(l: Listener) {
  return store.subscribe(l);
}

const EMPTY: Set<string> = new Set();
function getServerSnapshot(): Set<string> {
  return EMPTY;
}

/** Hook returning the live Set of followed IDs and an update API. */
export function useFollows() {
  useEffect(() => {
    store.hydrate();
  }, []);
  const set = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    follows: set,
    isFollowing: (id: string) => set.has(id),
    toggle: (id: string) => store.toggle(id),
    count: set.size,
  };
}

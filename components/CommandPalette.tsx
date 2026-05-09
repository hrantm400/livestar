"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Sparkles, Globe, ExternalLink } from "lucide-react";
import Avatar from "./Avatar";
import { useCelebrities, useFeed } from "@/lib/use-data";
import { CATEGORY_LABEL } from "@/lib/types";
import { useUI } from "@/lib/store";
import { cn, fuzzyMatch } from "@/lib/utils";

interface ExternalHit {
  title: string;
  description: string;
  thumbnail?: string;
  pageId: number;
}

export default function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const togglePalette = useUI((s) => s.togglePalette);
  const select = useUI((s) => s.select);
  const flyTo = useUI((s) => s.flyTo);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: list } = useCelebrities();
  const { data: feed } = useFeed();

  const lastByCeleb = useMemo(() => {
    const m = new Map<string, { type: string; city: string; when: string; lat: number; lng: number }>();
    for (const e of feed ?? []) {
      if (!m.has(e.celebrityId)) m.set(e.celebrityId, { type: e.type, city: e.city, when: e.when, lat: e.lat, lng: e.lng });
    }
    return m;
  }, [feed]);

  const items = useMemo(() => {
    return (list ?? [])
      .filter((c) => fuzzyMatch(query, c.name, c.handle, CATEGORY_LABEL[c.category], c.bio))
      .slice(0, 6);
  }, [list, query]);

  // External Wikipedia search — debounced, only when local has < 4 hits
  const [externalHits, setExternalHits] = useState<ExternalHit[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 3 || items.length >= 4) {
      setExternalHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setExternalLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { external?: ExternalHit[] };
        setExternalHits(data.external ?? []);
      } catch {
        /* aborted */
      } finally {
        setExternalLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open, items.length]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setExternalHits([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  const onPick = (id: string) => {
    select(id);
    const last = lastByCeleb.get(id);
    if (last) flyTo({ lng: last.lng, lat: last.lat, zoom: 6 });
    togglePalette(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] grid place-items-start pt-[14vh] px-4 bg-black/60 backdrop-blur-sm"
          onClick={() => togglePalette(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl glass-strong rounded-xl overflow-hidden shadow-2xl"
            style={{ boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(232,201,130,0.08)" }}
            onKeyDown={(e) => {
              if (e.key === "Escape") togglePalette(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                if (items[cursor]) onPick(items[cursor].id);
              }
            }}
          >
            <div className="flex items-center gap-3 px-5 py-4 hairline-b">
              <Search size={16} className="text-ink-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the constellation…"
                className="flex-1 bg-transparent outline-none text-[15px] text-ink-0 placeholder-ink-4"
              />
              <kbd className="px-2 py-1 rounded bg-white/[0.06] border border-line-1 text-ink-3 text-[10px]">ESC</kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {items.length > 0 && (
                <>
                  <SectionHeader label="Indexed stars" count={items.length} />
                  {items.map((c, idx) => {
                    const last = lastByCeleb.get(c.id);
                    const active = idx === cursor;
                    return (
                      <button
                        key={c.id}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => onPick(c.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                          active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                        )}
                      >
                        <Avatar initials={c.initials} category={c.category} online={c.online} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[14px] font-semibold text-ink-0 truncate">{c.name}</div>
                          <div className="text-[11px] text-ink-3 truncate flex items-center gap-2">
                            <span>{CATEGORY_LABEL[c.category]}</span>
                            {last?.type === "now" && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 text-accent">
                                  <Sparkles size={10} />
                                  Live in {last.city}
                                </span>
                              </>
                            )}
                            {last?.type === "soon" && (
                              <>
                                <span>·</span>
                                <span className="text-cyan-400">{last.when} in {last.city}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {active && <ArrowRight size={14} className="text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}

              {items.length === 0 && !externalLoading && externalHits.length === 0 && (
                <div className="px-5 py-10 text-center text-ink-3 text-[13px]">
                  {query.length < 3
                    ? "Type at least 3 letters to search Wikipedia…"
                    : "No matches. Try a different name."}
                </div>
              )}

              {(externalLoading || externalHits.length > 0) && (
                <>
                  <SectionHeader label="From Wikipedia" count={externalHits.length} loading={externalLoading} />
                  {externalLoading && externalHits.length === 0 && (
                    <div className="px-5 py-3 text-[11px] text-ink-4 font-mono uppercase tracking-wider">
                      Searching…
                    </div>
                  )}
                  {externalHits.map((h) => (
                    <a
                      key={h.pageId}
                      href={`https://en.wikipedia.org/?curid=${h.pageId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/[0.03] group"
                    >
                      {h.thumbnail ? (
                        <img
                          src={h.thumbnail}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover shrink-0 border border-line-1"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-white/[0.06] grid place-items-center shrink-0 border border-line-1">
                          <Globe size={14} className="text-ink-3" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-ink-0 truncate">{h.title}</div>
                        <div className="text-[11px] text-ink-3 truncate">{h.description || "Wikipedia article"}</div>
                      </div>
                      <ExternalLink size={13} className="text-ink-3 group-hover:text-ink-0 shrink-0" />
                    </a>
                  ))}
                </>
              )}
            </div>

            <div className="hairline-t px-5 py-2.5 flex items-center gap-4 text-[10px] text-ink-3 font-mono uppercase tracking-wider">
              <Tip k="↑↓" label="Navigate" />
              <Tip k="↵" label="Select" />
              <Tip k="esc" label="Close" />
              <div className="ml-auto flex items-center gap-1.5 text-ink-4">
                <Globe size={10} />
                {(list?.length ?? 0)} stars indexed
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tip({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-line-1 text-ink-2 normal-case">{k}</kbd>
      {label}
    </span>
  );
}

function SectionHeader({ label, count, loading }: { label: string; count: number; loading?: boolean }) {
  return (
    <div className="px-5 pt-3 pb-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4 flex items-center gap-2">
      <span>{label}</span>
      {!loading && count > 0 && <span className="text-ink-3 tabular-nums">{count}</span>}
      {loading && (
        <span className="inline-flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" />
          <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" style={{ animationDelay: "0.15s" }} />
          <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
        </span>
      )}
      <span className="flex-1 h-px bg-line-1 ml-2" />
    </div>
  );
}

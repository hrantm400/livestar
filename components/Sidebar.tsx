"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Heart, Star } from "lucide-react";
import Avatar from "./Avatar";
import { useCelebrities, useFeed, prefetchProfile } from "@/lib/use-data";
import { CATEGORY_COLORS, CATEGORY_LABEL, Celebrity } from "@/lib/types";
import { useUI } from "@/lib/store";
import { useFollows } from "@/lib/follows";
import { cn, fuzzyMatch } from "@/lib/utils";

export default function Sidebar() {
  const selectedId = useUI((s) => s.selectedId);
  const select = useUI((s) => s.select);
  const category = useUI((s) => s.category);
  const search = useUI((s) => s.search);
  const setSearch = useUI((s) => s.setSearch);
  const flyTo = useUI((s) => s.flyTo);
  const [followedOnly, setFollowedOnly] = useState(false);

  const { data: list, loading } = useCelebrities();
  const { data: feed } = useFeed();
  const { isFollowing, count: followedCount } = useFollows();

  const lastByCeleb = useMemo(() => {
    const map = new Map<string, { type: string; city: string; when: string; lat: number; lng: number }>();
    for (const e of feed ?? []) {
      if (!map.has(e.celebrityId)) {
        map.set(e.celebrityId, { type: e.type, city: e.city, when: e.when, lat: e.lat, lng: e.lng });
      }
    }
    return map;
  }, [feed]);

  const filtered = useMemo(() => {
    if (!list) return [] as Celebrity[];
    return list.filter((c) => {
      if (followedOnly && !isFollowing(c.id)) return false;
      if (category !== "all" && c.category !== category) return false;
      if (!fuzzyMatch(search, c.name, c.handle, c.category, c.bio)) return false;
      return true;
    });
  }, [list, category, search, followedOnly, isFollowing]);

  const onPick = (id: string) => {
    select(id);
    const last = lastByCeleb.get(id);
    if (last) flyTo({ lng: last.lng, lat: last.lat, zoom: 6 });
  };

  return (
    <aside
      className="glass relative flex flex-col rounded-xl overflow-hidden noise"
      style={{ gridArea: "sidebar" }}
    >
      <div className="px-5 pt-5 pb-4 hairline-b">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="label-eyebrow">Constellation</h2>
          <span className="font-mono text-[10px] text-ink-4 tabular-nums">
            {filtered.length} / {list?.length ?? "—"}
          </span>
        </div>
        <div className="relative mb-2.5">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the index…"
            className="w-full h-9 pl-8 pr-8 rounded-lg bg-bg-2/60 border border-line-1 text-[13px] text-ink-0 placeholder-ink-4 focus:outline-none focus:border-accent/40 focus:bg-bg-2 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-0">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFollowedOnly(false)}
            className={cn(
              "flex-1 h-6 rounded text-[10px] font-mono uppercase tracking-[0.14em] transition-colors",
              !followedOnly
                ? "bg-line-1 text-ink-0"
                : "text-ink-3 hover:text-ink-1"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFollowedOnly(true)}
            disabled={followedCount === 0}
            className={cn(
              "flex-1 h-6 rounded text-[10px] font-mono uppercase tracking-[0.14em] transition-colors flex items-center justify-center gap-1.5",
              followedCount === 0 && "opacity-30 cursor-not-allowed",
              followedOnly
                ? "bg-accent/15 text-accent"
                : "text-ink-3 hover:text-ink-1"
            )}
          >
            <Heart size={9} fill={followedOnly ? "currentColor" : "none"} />
            Following · {followedCount}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {loading && (!list || list.length === 0) && <SkeletonList />}
        <AnimatePresence>
          {!loading && filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-8 text-center text-ink-3 text-[13px]"
            >
              {search ? `No stars match "${search}".` : "No stars."}
            </motion.div>
          )}
        </AnimatePresence>
        {filtered.map((c, idx) => {
          const last = lastByCeleb.get(c.id);
          const active = selectedId === c.id;
          const stagger = idx < 16 ? idx * 0.012 : 0;
          return (
            <motion.button
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: stagger, duration: 0.15 }}
              onClick={() => onPick(c.id)}
              onMouseEnter={() => prefetchProfile(c.id)}
              onFocus={() => prefetchProfile(c.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors relative",
                active
                  ? "bg-line-1"
                  : "hover:bg-line-1/50"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-[2px] rounded-r-full bg-accent" />
              )}
              <Avatar initials={c.initials} category={c.category} online={c.online} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-medium tracking-[-0.01em] truncate text-ink-0">
                    {c.name}
                  </span>
                  {isFollowing(c.id) && (
                    <Star size={9} className="text-accent shrink-0" fill="currentColor" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-3">
                  <span
                    className="font-mono uppercase tracking-[0.12em] text-[9px]"
                    style={{ color: CATEGORY_COLORS[c.category] }}
                  >
                    {CATEGORY_LABEL[c.category]}
                  </span>
                  {c.followers && (
                    <>
                      <span className="text-line-3">·</span>
                      <span className="font-mono tabular-nums text-[10px]">{c.followers}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {last?.type === "now" ? (
                  <div className="flex items-center gap-1 justify-end">
                    <span className="h-1 w-1 rounded-full bg-accent-live animate-pulse-soft" />
                    <span className="text-[10px] text-accent-live font-mono uppercase tracking-[0.14em]">Live</span>
                  </div>
                ) : last?.type === "soon" ? (
                  <span className="text-[10px] text-ink-2 font-mono">{last.when}</span>
                ) : last ? (
                  <span className="text-[10px] text-ink-3 font-mono">{last.when}</span>
                ) : null}
                <div className="text-[9px] text-ink-4 mt-0.5 truncate max-w-[80px]">
                  {last?.city ?? ""}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
          <div className="h-10 w-10 rounded-full bg-white/[0.05] animate-pulse-soft" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-white/[0.05] animate-pulse-soft" />
            <div className="h-2 w-1/2 rounded bg-white/[0.04] animate-pulse-soft" />
          </div>
        </div>
      ))}
    </div>
  );
}

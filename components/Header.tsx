"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Command, RefreshCw } from "lucide-react";
import Logo from "./Logo";
import { useCelebrities, useFeed, invalidate } from "@/lib/use-data";
import { useUI } from "@/lib/store";
import { useFollows } from "@/lib/follows";
import { toast } from "./Toast";

export default function Header() {
  const togglePalette = useUI((s) => s.togglePalette);
  const select = useUI((s) => s.select);
  const flyTo = useUI((s) => s.flyTo);
  const [mac, setMac] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { data: list } = useCelebrities();
  const { data: feed } = useFeed();
  const { follows } = useFollows();

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  const tickerItems = useMemo(() => {
    if (!feed?.length) return [];
    return feed.slice(0, 30).map((e) => ({
      name: e.celebrityName,
      verb: e.type === "now" ? "in" : e.type === "soon" ? "→" : "·",
      place: e.city,
      when: e.when,
      type: e.type as "now" | "soon" | "past",
    }));
  }, [feed]);

  const stats = useMemo(() => {
    const tracked = list?.length ?? 0;
    const events = feed?.length ?? 0;
    const cities = new Set(feed?.map((e) => e.city)).size;
    return { tracked, events, cities };
  }, [list, feed]);

  const followedLive = useMemo(() => {
    if (!feed?.length || follows.size === 0) return [] as typeof feed;
    return feed.filter((e) => e.type === "now" && follows.has(e.celebrityId));
  }, [feed, follows]);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    invalidate("feed");
    invalidate("list");
    try {
      await fetch("/api/feed?fresh=1", { cache: "no-store" }).catch(() => null);
      toast("Feed refreshed", "success");
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  const onJumpToLive = () => {
    if (!followedLive.length) return;
    const e = followedLive[0];
    select(e.celebrityId);
    flyTo({ lng: e.lng, lat: e.lat, zoom: 6 });
    toast(`${e.celebrityName} is live in ${e.city}`, "info");
  };

  return (
    <header
      className="glass relative flex items-center gap-6 rounded-xl px-5"
      style={{ gridArea: "header" }}
    >
      {/* ── Wordmark ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 shrink-0">
        <Logo size={28} />
        <div className="leading-none">
          <div className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink-0">
            Stellar
          </div>
          <div className="label-eyebrow mt-1">Activity Index</div>
        </div>
      </div>

      <div className="h-7 w-px bg-line-1 shrink-0" />

      {/* ── Live ticker ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 h-7 flex items-center gap-3 overflow-hidden relative">
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-accent-live animate-ping opacity-60" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-accent-live" />
          </span>
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-accent-live">
            Live
          </span>
        </div>

        <div className="flex-1 overflow-hidden mask-fade-x">
          {tickerItems.length > 0 ? (
            <div
              className="flex gap-8 whitespace-nowrap text-[12px] text-ink-2 animate-ticker"
              style={{ width: "max-content" }}
            >
              {[...tickerItems, ...tickerItems].map((it, i) => (
                <span key={i} className="inline-flex items-center gap-2 shrink-0">
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{
                      background:
                        it.type === "now" ? "#e8c982" :
                        it.type === "soon" ? "#9a968d" : "#6f6c63",
                    }}
                  />
                  <strong className="text-ink-0 font-medium tracking-[-0.01em]">{it.name}</strong>
                  <span className="text-ink-3">{it.verb}</span>
                  <span className="text-ink-1 font-medium">{it.place}</span>
                  <span className="text-ink-4 font-mono text-[11px]">{it.when}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-ink-3 font-mono uppercase tracking-[0.18em]">
              <span className="inline-block animate-pulse-soft">Aggregating Wikipedia · GDELT · Reddit · TheSportsDB · iTunes…</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────── */}
      <div className="hidden xl:flex items-center gap-5 shrink-0">
        <Stat label="Tracked" num={stats.tracked} />
        <Stat label="Events" num={stats.events} />
        <Stat label="Cities" num={stats.cities} />
      </div>

      <div className="hidden xl:block h-7 w-px bg-line-1 shrink-0" />

      {/* ── Actions ─────────────────────────────────────────── */}
      {followedLive.length > 0 && (
        <motion.button
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onJumpToLive}
          className="shrink-0 flex items-center gap-2 px-3 h-8 rounded-full bg-accent/10 border border-accent/30 text-accent text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-accent/15 transition-colors"
          title={`${followedLive.length} you follow are live now — jump to ${followedLive[0].celebrityName}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-50" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-accent" />
          </span>
          {followedLive.length} live
        </motion.button>
      )}

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => togglePalette(true)}
        className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-full border border-line-2 hover:border-line-3 transition-colors text-[11px] text-ink-1 font-mono"
      >
        <Command size={12} />
        <span className="tracking-[0.1em]">{mac ? "⌘" : "Ctrl"} K</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.06, rotate: refreshing ? 0 : 28 }}
        whileTap={{ scale: 0.94 }}
        onClick={onRefresh}
        disabled={refreshing}
        className="shrink-0 grid place-items-center h-8 w-8 rounded-full border border-line-2 hover:border-line-3 transition-colors text-ink-2 hover:text-ink-0 disabled:opacity-50"
        aria-label="Refresh live feed"
        title="Refresh live feed"
      >
        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
      </motion.button>
    </header>
  );
}

function Stat({ label, num }: { label: string; num: number }) {
  return (
    <div className="flex items-baseline gap-1.5 leading-none">
      <span className="font-display text-[18px] font-semibold text-ink-0 tabular-nums tracking-[-0.02em]">
        {num.toLocaleString()}
      </span>
      <span className="label-eyebrow">{label}</span>
    </div>
  );
}

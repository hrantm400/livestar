"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Compass, Newspaper, X, ExternalLink, Heart, Share2,
  Activity, Music, Globe2, Twitter, Instagram, Link as LinkIcon,
  Eye,
} from "lucide-react";
import Avatar from "./Avatar";
import { useCelebrities, useProfile } from "@/lib/use-data";
import { CATEGORY_COLORS, CATEGORY_LABEL } from "@/lib/types";
import { useUI } from "@/lib/store";
import { useFollows } from "@/lib/follows";
import { copyShareLink } from "@/lib/share";
import { toast } from "./Toast";
import { cn } from "@/lib/utils";

export default function DetailPanel() {
  const selectedId = useUI((s) => s.selectedId);
  const select = useUI((s) => s.select);
  const flyTo = useUI((s) => s.flyTo);
  const { data: profile, loading } = useProfile(selectedId);
  const { data: list } = useCelebrities();
  const { isFollowing, toggle } = useFollows();

  // Brief celebrity stub from the registry list. Lets us paint the panel
  // hero (avatar / name / category) instantly while the full profile fetch
  // (Wikipedia, GDELT, Reddit, etc.) is still in flight.
  const brief = selectedId ? list?.find((c) => c.id === selectedId) ?? null : null;

  // The view we render from: full profile if loaded, otherwise the brief stub.
  const view = profile ?? brief;
  const followed = view ? isFollowing(view.id) : false;

  // Show ErrorState only when truly nothing exists for this id and we've stopped loading.
  const isError = !!selectedId && !loading && !profile && !brief;

  return (
    <aside className="glass relative rounded-xl overflow-hidden flex flex-col noise" style={{ gridArea: "detail" }}>
      <AnimatePresence mode="wait">
        {!selectedId ? (
          <EmptyState key="empty" />
        ) : isError ? (
          <ErrorState key="error" />
        ) : !view ? (
          <LoadingState key="loading" />
        ) : (
          <motion.div
            key={view.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="flex-1 overflow-y-auto"
          >
            {/* hero — paints from `view` (brief or profile), so it appears
                instantly when the user clicks; rich data fades in as `profile`
                resolves. */}
            <div
              className="relative px-6 pt-6 pb-5 hairline-b overflow-hidden transition-[background-image] duration-500"
              style={{
                backgroundImage: profile?.imageUrl
                  ? `linear-gradient(180deg, rgba(6,6,10,0.45), rgba(6,6,10,0.95)), url("${profile.imageUrl}")`
                  : "radial-gradient(circle at 80% 0%, rgba(232,201,130,0.10), transparent 55%)",
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <Avatar initials={view.initials} category={view.category} online={view.online} size={68} />
                <div className="flex items-center gap-2">
                  {loading && !profile && (
                    <span
                      className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-3 inline-flex items-center gap-1.5"
                      title="Aggregating from public sources"
                    >
                      <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" />
                      <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" style={{ animationDelay: "0.15s" }} />
                      <span className="h-1 w-1 rounded-full bg-accent animate-pulse-soft" style={{ animationDelay: "0.3s" }} />
                      Syncing
                    </span>
                  )}
                  <button
                    onClick={() => select(null)}
                    className="text-ink-3 hover:text-ink-0 p-1 -m-1"
                    aria-label="Close detail panel"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.025em] text-ink-0">
                {view.name}
              </h2>
              <div className="flex items-center gap-2.5 mt-2 mb-4 text-[12px]">
                {view.handle && <span className="text-ink-2">{view.handle}</span>}
                {view.handle && <span className="h-3 w-px bg-line-2" />}
                <span className="font-mono uppercase tracking-[0.16em] text-[10px]" style={{ color: CATEGORY_COLORS[view.category] }}>
                  {CATEGORY_LABEL[view.category]}
                </span>
              </div>

              {/* Bio: real text once loaded, otherwise a skeleton block. */}
              {profile?.bio ? (
                <p className="text-[12.5px] text-ink-1 leading-[1.55] mb-5 line-clamp-3 tracking-[-0.005em]">
                  {profile.bio}
                </p>
              ) : loading ? (
                <div className="space-y-1.5 mb-5">
                  <div className="h-2.5 w-full rounded bg-line-1 animate-pulse-soft" />
                  <div className="h-2.5 w-[92%] rounded bg-line-1 animate-pulse-soft" />
                  <div className="h-2.5 w-[68%] rounded bg-line-1 animate-pulse-soft" />
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Stat
                  label="Wiki views"
                  value={profile?.pageviewsLabel ?? view.followers ?? "—"}
                  icon={<Eye size={9} />}
                />
                <Stat label="Upcoming" value={(profile?.events ?? []).filter((e) => e.type === "soon").length} />
                <Stat label="Reddit" value={profile?.redditScore ?? "—"} />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const nowFollowing = toggle(view.id);
                    toast(
                      nowFollowing ? `Following ${view.name}` : `Unfollowed ${view.name}`,
                      "success"
                    );
                  }}
                  className={cn(
                    "flex-1 h-9 rounded text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors border tracking-[-0.005em]",
                    followed
                      ? "bg-line-1 border-line-2 text-ink-0 hover:bg-line-2"
                      : "bg-accent hover:bg-accent-warm border-transparent text-bg-0"
                  )}
                >
                  <Heart size={12} fill={followed ? "currentColor" : "none"} />
                  {followed ? "Following" : "Follow"}
                </button>
                <button
                  onClick={async () => {
                    await copyShareLink(view.id, view.name);
                    toast("Share link copied", "success");
                  }}
                  className="h-9 w-9 grid place-items-center rounded border border-line-1 text-ink-2 hover:text-ink-0 hover:bg-line-1 transition-colors"
                  aria-label="Copy share link"
                >
                  <Share2 size={14} />
                </button>
                {profile?.wikiUrl && (
                  <a
                    href={profile.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 grid place-items-center rounded border border-line-1 text-ink-2 hover:text-ink-0 hover:bg-line-1 transition-colors"
                    aria-label="Open Wikipedia"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>

            {/* social handles + birthplace */}
            {profile && (profile.twitter || profile.instagram || profile.tiktok || profile.officialWebsite || profile.birthplace) && (
              <Section title="Profile" icon={<LinkIcon size={11} />}>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {profile.twitter && (
                    <SocialChip
                      icon={<Twitter size={10} />}
                      label={`@${profile.twitter}`}
                      href={`https://twitter.com/${profile.twitter}`}
                    />
                  )}
                  {profile.instagram && (
                    <SocialChip
                      icon={<Instagram size={10} />}
                      label={`@${profile.instagram}`}
                      href={`https://instagram.com/${profile.instagram}`}
                    />
                  )}
                  {profile.tiktok && (
                    <SocialChip
                      icon={<span className="text-[9px] font-bold">TT</span>}
                      label={`@${profile.tiktok}`}
                      href={`https://tiktok.com/@${profile.tiktok}`}
                    />
                  )}
                  {profile.officialWebsite && (
                    <SocialChip
                      icon={<LinkIcon size={10} />}
                      label={new URL(profile.officialWebsite).hostname.replace(/^www\./, "")}
                      href={profile.officialWebsite}
                    />
                  )}
                </div>
                {profile.birthplace && (
                  <button
                    onClick={() => {
                      flyTo({ lng: profile.birthplace!.lng, lat: profile.birthplace!.lat, zoom: 8 });
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-line-1 hover:bg-white/[0.06] hover:border-line-2 transition-colors text-[11px]"
                  >
                    <MapPin size={11} className="text-ink-3" />
                    <span className="text-ink-2">Born in</span>
                    <span className="text-ink-0 font-medium">{profile.birthplace.name}</span>
                    <span className="ml-auto text-[10px] text-accent">View →</span>
                  </button>
                )}
              </Section>
            )}

            {/* trend volume */}
            {profile?.trendVolume && profile.trendVolume.length > 0 && (
              <Section title="News Volume (7d)" icon={<Activity size={11} />}>
                <Sparkline values={profile.trendVolume} />
              </Section>
            )}

            {/* timeline */}
            {profile && profile.events.length > 0 && (
              <Section title="Public Activity Timeline" icon={<Compass size={11} />}>
                <div className="relative pl-5">
                  <div className="absolute left-1 top-2 bottom-2 w-px bg-line-2" />
                  {profile.events.map((ev, idx) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="relative pb-4 mb-4 hairline-b last:border-0 last:pb-0 last:mb-0"
                    >
                      <span
                        className={cn(
                          "absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full",
                          ev.type === "now" && "bg-accent",
                          ev.type === "soon" && "bg-cyan-400",
                          ev.type === "past" && "bg-ink-4"
                        )}
                        style={{
                          boxShadow: ev.type === "now" ? "0 0 0 3px var(--bg-1), 0 0 14px #fbbf24" : "0 0 0 3px var(--bg-1)",
                        }}
                      />
                      <div
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-[0.15em] font-bold mb-1 flex items-center gap-1.5",
                          ev.type === "now" && "text-accent",
                          ev.type === "soon" && "text-cyan-400",
                          ev.type === "past" && "text-ink-3"
                        )}
                      >
                        {ev.type === "now" && <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />}
                        {ev.when}
                      </div>
                      <div className="text-[13px] font-semibold leading-snug mb-1.5">{ev.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-ink-2 mb-2">
                        <MapPin size={10} className="text-ink-3" />
                        {ev.place}
                      </div>
                      {ev.detail && <p className="text-[11px] text-ink-3 leading-relaxed mb-2">{ev.detail}</p>}
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-ink-3 px-2 py-0.5 rounded bg-white/[0.04] border border-line-1">
                          <Newspaper size={9} />
                          {ev.source}
                        </span>
                        <button
                          onClick={() => flyTo({ lng: ev.lng, lat: ev.lat, zoom: 12 })}
                          className="text-[11px] text-accent hover:underline font-medium"
                        >
                          View on map →
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Section>
            )}

            {/* news */}
            {profile && profile.newsArticles.length > 0 && (
              <Section title="In the News" icon={<Newspaper size={11} />}>
                <div className="space-y-2">
                  {profile.newsArticles.slice(0, 6).map((a, i) => (
                    <a
                      key={i}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-line-1 hover:border-line-2 transition-colors"
                    >
                      <div className="text-[12px] font-medium text-ink-0 leading-snug line-clamp-2 mb-1.5">
                        {a.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-ink-3">
                        <span className="font-mono uppercase tracking-wider">{a.domain}</span>
                        <span className="text-ink-4">·</span>
                        <span>{new Date(a.seenAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* releases (music) */}
            {profile && profile.releases.length > 0 && (
              <Section title="Recent Releases" icon={<Music size={11} />}>
                <div className="grid grid-cols-3 gap-2">
                  {profile.releases.slice(0, 6).map((r, i) => (
                    <a
                      key={i}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div
                        className="aspect-square rounded-lg bg-white/[0.04] bg-cover bg-center border border-line-1 group-hover:border-accent/50 transition-colors"
                        style={{ backgroundImage: `url("${r.artworkUrl}")` }}
                      />
                      <div className="mt-1.5 text-[10px] font-medium text-ink-1 truncate">{r.title}</div>
                      <div className="text-[9px] text-ink-4 tabular-nums">{r.releaseDate.slice(0, 4)}</div>
                    </a>
                  ))}
                </div>
              </Section>
            )}

            {/* live sources */}
            {profile && (
            <Section title="Live Sources" icon={<Globe2 size={11} />}>
              <div className="grid grid-cols-2 gap-1.5">
                {profile.liveSources.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-line-1 text-[10px]">
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.ok ? "bg-emerald-400" : "bg-ink-4")} />
                    <span className="flex-1 text-ink-1 font-medium">{s.name}</span>
                    {s.count !== undefined && <span className="text-ink-3 tabular-nums">{s.count}</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-ink-4 leading-relaxed mt-3">
                Aggregated live from public-only sources. No predictive location tracking.
              </p>
            </Section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded bg-bg-2/50 border border-line-1 px-3 py-2.5 backdrop-blur-sm">
      <div className="font-display text-[16px] font-semibold text-ink-0 tabular-nums leading-none tracking-[-0.02em]">
        {value}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3 mt-1.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
    </div>
  );
}

function SocialChip({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-line-1 hover:border-accent/40 hover:bg-line-1/70 transition-colors text-[11px] text-ink-1"
    >
      <span className="text-ink-3">{icon}</span>
      <span className="tracking-[-0.005em]">{label}</span>
    </a>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 hairline-b last:border-0">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="label-eyebrow flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        <div className="flex-1 h-px bg-line-1" />
      </div>
      {children}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-accent/20 to-accent/80"
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          title={`${v} mentions`}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center px-8 text-center"
    >
      <div className="relative h-24 w-24 mb-5">
        <div className="absolute inset-0 rounded-full border border-dashed border-line-3" />
        <div className="absolute inset-3 rounded-full border border-dashed border-line-2 animate-orbit" style={{ animationDuration: "16s" }} />
        <div className="absolute inset-0 grid place-items-center text-ink-3">
          <Compass size={28} />
        </div>
      </div>
      <div className="font-display text-[18px] font-bold text-ink-0 mb-1.5">Pick a star</div>
      <p className="text-[12px] text-ink-3 leading-relaxed max-w-[240px]">
        Choose someone from the constellation, or tap a pin on the map to view their public activity timeline.
      </p>
      <div className="mt-5 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
        Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-line-1 text-ink-2">⌘K</kbd> to search
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <div className="h-16 w-16 rounded-full bg-white/[0.04] animate-pulse-soft" />
      <div className="h-8 w-2/3 rounded bg-white/[0.04] animate-pulse-soft" />
      <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse-soft" />
      <div className="space-y-2 mt-6">
        <div className="h-4 w-full rounded bg-white/[0.03] animate-pulse-soft" />
        <div className="h-4 w-11/12 rounded bg-white/[0.03] animate-pulse-soft" />
        <div className="h-4 w-3/4 rounded bg-white/[0.03] animate-pulse-soft" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse-soft" />
        ))}
      </div>
      <div className="text-[10px] text-ink-4 font-mono uppercase tracking-[0.2em] text-center pt-4">
        Aggregating Wikipedia · GDELT · Reddit · TheSportsDB · iTunes…
      </div>
    </motion.div>
  );
}

function ErrorState() {
  return (
    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className="text-ink-2 text-[13px]">Could not load profile.</div>
      <div className="text-ink-4 text-[11px] mt-2">Try selecting another star.</div>
    </motion.div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Globe, MapPin, Flame, Sparkles } from "lucide-react";
import { useFeed, useCelebrities, prefetchProfile } from "@/lib/use-data";
import { CATEGORY_COLORS } from "@/lib/types";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const SRC = "stellar-events";
const HEATMAP = "stellar-heatmap";
const PULSE = "stellar-pulse";
const HALO = "stellar-halo";
const PIN = "stellar-pin";
const LABEL = "stellar-label";
const PIN_LAYERS = [PULSE, HALO, PIN, LABEL] as const;

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const rafRef = useRef<number | null>(null);
  const selectRef = useRef<(id: string) => void>(() => {});
  const [ready, setReady] = useState(false);

  const category = useUI((s) => s.category);
  const when = useUI((s) => s.when);
  const select = useUI((s) => s.select);
  const flyTarget = useUI((s) => s.flyTarget);
  const mapMode = useUI((s) => s.mapMode);
  const setMapMode = useUI((s) => s.setMapMode);

  const { data: feed, loading: feedLoading } = useFeed();
  const { data: list } = useCelebrities();

  // keep latest select callable from event handlers without re-binding listeners
  selectRef.current = select;

  const celebById = useMemo(() => {
    const m = new Map<string, { initials: string; category: string }>();
    (list ?? []).forEach((c) => m.set(c.id, { initials: c.initials, category: c.category }));
    return m;
  }, [list]);

  /* ---------- INIT MAP ONCE ---------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [10, 25],
      zoom: 1.6,
      attributionControl: { compact: true },
      pitchWithRotate: false,
      dragRotate: false,
      // perf nudges
      fadeDuration: 100,
      crossSourceCollisions: false,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    m.on("load", () => {
      // single empty source — we'll setData() as feed updates
      m.addSource(SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "id",
      });

      // ── HEATMAP ──
      m.addLayer({
        id: HEATMAP,
        type: "heatmap",
        source: SRC,
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["match", ["get", "type"], "now", 3, "soon", 2, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(33,102,172,0)",
            0.2, "rgba(168,85,247,0.5)",
            0.4, "rgba(236,72,153,0.7)",
            0.6, "rgba(245,158,11,0.85)",
            0.8, "rgba(251,191,36,0.95)",
            1, "rgba(255,255,200,1)",
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 12, 9, 60],
          "heatmap-opacity": 0.85,
        },
      });

      // ── PULSE ring (only for "now" events; radius animated) ──
      m.addLayer({
        id: PULSE,
        type: "circle",
        source: SRC,
        filter: ["==", ["get", "type"], "now"],
        paint: {
          "circle-radius": 14,
          "circle-color": "transparent",
          "circle-stroke-color": "#fbbf24",
          "circle-stroke-width": 1.2,
          "circle-stroke-opacity": 0.55,
        },
      });

      // ── HALO under main pin (subtler) ──
      m.addLayer({
        id: HALO,
        type: "circle",
        source: SRC,
        paint: {
          "circle-radius": 11,
          "circle-color": ["get", "color"],
          "circle-opacity": [
            "match",
            ["get", "type"],
            "past", 0.06,
            0.14,
          ],
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-width": 0.8,
          "circle-stroke-opacity": [
            "match",
            ["get", "type"],
            "past", 0.22,
            0.42,
          ],
        },
      });

      // ── MAIN PIN — smaller, more refined ──
      m.addLayer({
        id: PIN,
        type: "circle",
        source: SRC,
        paint: {
          "circle-radius": 7,
          "circle-color": ["get", "color"],
          "circle-stroke-color": "rgba(236, 232, 223, 0.85)",
          "circle-stroke-width": 1,
          "circle-opacity": ["match", ["get", "type"], "past", 0.7, 1],
        },
      });

      // ── INITIALS LABEL — only at higher zoom levels for cleanliness ──
      m.addLayer({
        id: LABEL,
        type: "symbol",
        source: SRC,
        minzoom: 4,
        layout: {
          "text-field": ["get", "initials"],
          "text-size": 8,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-offset": [0, 1.4],
          "text-letter-spacing": 0.06,
        },
        paint: {
          "text-color": "rgba(236, 232, 223, 0.85)",
          "text-halo-color": "rgba(6, 6, 10, 0.85)",
          "text-halo-width": 1,
        },
      });

      // ── HOVER POPUP (single, reused) ──
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: "280px" });
      popupRef.current = popup;

      const onEnter = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, string>;
        // warm the profile cache so the click that follows is instant
        if (props.celebrityId) prefetchProfile(props.celebrityId);
        const tagBg =
          props.type === "now" ? "rgba(251,191,36,0.18)" :
          props.type === "soon" ? "rgba(34,211,238,0.16)" : "rgba(107,114,128,0.2)";
        const tagFg = props.type === "now" ? "#fbbf24" : props.type === "soon" ? "#22d3ee" : "#9ca3af";
        const tagTxt = props.type === "now" ? "Active now" : props.type === "soon" ? "Upcoming" : "Past";
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family:var(--font-fraunces),Georgia,serif;font-weight:600;font-size:15px;margin-bottom:6px;letter-spacing:-0.01em;color:#ece8df;">${escapeHtml(props.celebrityName)}</div>
            <div style="color:#c5c1b8;font-size:12px;line-height:1.5;">${escapeHtml(props.title)}</div>
            <div style="color:#9a968d;font-size:10.5px;margin-top:6px;letter-spacing:0.04em;">${escapeHtml(props.place)} &nbsp;·&nbsp; ${escapeHtml(props.when)}</div>
            <span style="display:inline-block;margin-top:8px;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.16em;background:${tagBg};color:${tagFg};">${tagTxt}</span>
          `)
          .addTo(m);
        m.getCanvas().style.cursor = "pointer";
      };
      const onLeave = () => {
        popup.remove();
        m.getCanvas().style.cursor = "";
      };
      const onClick = (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties as Record<string, string>;
        if (props.celebrityId) selectRef.current(props.celebrityId);
      };

      // attach listeners on the interactive layers
      [PIN, HALO, LABEL].forEach((id) => {
        m.on("mouseenter", id, onEnter);
        m.on("mouseleave", id, onLeave);
        m.on("click", id, onClick);
      });

      setReady(true);
    });

    mapRef.current = m;
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      m.remove();
      mapRef.current = null;
    };
  }, []);

  /* ---------- DATA → SOURCE ---------- */
  const features = useMemo(() => {
    if (!feed) return [];
    return feed
      .filter((e) => {
        if (when !== "all" && e.type !== when) return false;
        const c = celebById.get(e.celebrityId);
        if (category !== "all" && c?.category !== category) return false;
        return true;
      })
      .map((e) => {
        const meta = celebById.get(e.celebrityId);
        const cat = meta?.category as keyof typeof CATEGORY_COLORS | undefined;
        const color = (cat && CATEGORY_COLORS[cat]) ?? "#fbbf24";
        return {
          type: "Feature" as const,
          id: e.id,
          geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
          properties: {
            id: e.id,
            celebrityId: e.celebrityId,
            celebrityName: e.celebrityName,
            initials: meta?.initials ?? "",
            color,
            type: e.type,
            title: e.title,
            place: e.place,
            when: e.when,
          },
        };
      });
  }, [feed, when, category, celebById]);

  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const src = mapRef.current.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: "FeatureCollection", features });
  }, [features, ready]);

  /* ---------- PULSE animation (cheap, paint-only) ---------- */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      const phase = ((t / 1600) % 1); // 0..1 once per 1.6s
      const radius = 14 + phase * 22;
      const opacity = (1 - phase) * 0.7;
      try {
        map.setPaintProperty(PULSE, "circle-radius", radius);
        map.setPaintProperty(PULSE, "circle-stroke-opacity", opacity);
      } catch {
        // layer not ready yet
      }
      void dt;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ready]);

  /* ---------- MODE TOGGLE (heatmap vs pins) ---------- */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    const map = mapRef.current;
    const heatmapVisible = mapMode === "heatmap";
    map.setLayoutProperty(HEATMAP, "visibility", heatmapVisible ? "visible" : "none");
    PIN_LAYERS.forEach((id) => {
      map.setLayoutProperty(id, "visibility", heatmapVisible ? "none" : "visible");
    });
  }, [mapMode, ready]);

  /* ---------- GLOBE PROJECTION ---------- */
  useEffect(() => {
    if (!mapRef.current || !ready) return;
    try {
      // @ts-expect-error — setProjection in MapLibre 4+
      mapRef.current.setProjection?.({ type: mapMode === "globe" ? "globe" : "mercator" });
    } catch {
      // older versions: ignore
    }
  }, [mapMode, ready]);

  /* ---------- FLY TO ---------- */
  useEffect(() => {
    if (!mapRef.current || !flyTarget) return;
    mapRef.current.flyTo({
      center: [flyTarget.lng, flyTarget.lat],
      zoom: flyTarget.zoom ?? 6,
      duration: 1400,
      essential: true,
    });
  }, [flyTarget]);

  const activeNow = features.filter((f) => f.properties.type === "now").length;

  return (
    <div className="relative rounded-xl overflow-hidden border border-line-1 bg-bg-1" style={{ gridArea: "map" }}>
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-lg px-4 py-3 pointer-events-auto min-w-[180px]"
        >
          <div className="label-eyebrow">Active in view</div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="font-display text-[22px] font-semibold text-ink-0 tabular-nums tracking-[-0.02em] leading-none">
              {features.length}
            </span>
            <span className="text-[11px] text-ink-3 font-mono uppercase tracking-[0.14em]">events</span>
          </div>
          {activeNow > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] text-accent-live font-mono uppercase tracking-[0.14em]">
              <span className="h-1 w-1 rounded-full bg-accent-live animate-pulse-soft" />
              {activeNow} live now
            </div>
          )}
        </motion.div>
      </div>

      <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-line-1 border border-line-2 text-ink-2 text-[9.5px] font-mono tracking-[0.18em] uppercase backdrop-blur-md flex items-center gap-1.5">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        Live data
      </div>

      <div className="absolute top-14 right-4 z-10 glass-strong rounded-lg p-0.5 flex flex-col gap-px">
        <ModeBtn icon={<MapPin size={13} />} active={mapMode === "pins"} onClick={() => setMapMode("pins")} label="Pins" />
        <ModeBtn icon={<Flame size={13} />} active={mapMode === "heatmap"} onClick={() => setMapMode("heatmap")} label="Heatmap" />
        <ModeBtn icon={<Globe size={13} />} active={mapMode === "globe"} onClick={() => setMapMode("globe")} label="Globe" />
      </div>

      <div className="absolute bottom-4 left-4 z-10 glass-strong rounded-lg px-3.5 py-3 text-[11px] min-w-[150px]">
        <div className="label-eyebrow flex items-center gap-1.5">
          <Layers size={10} />
          Activity
        </div>
        <div className="mt-2 space-y-1">
          <LegendRow color="#6f6c63" label="Past sighting" />
          <LegendRow color="#fbbf24" label="Active now" glow />
          <LegendRow color="#22d3ee" label="Upcoming" />
        </div>
      </div>

      <AnimatePresence>
        {(!ready || (feedLoading && features.length === 0)) && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 grid place-items-center bg-bg-1/80 z-20"
          >
            <div className="text-ink-3 text-[12px] font-mono uppercase tracking-[0.2em] flex flex-col items-center gap-2">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              {!ready ? "Loading map…" : "Aggregating live sources…"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModeBtn({ icon, active, onClick, label }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "h-7 w-7 grid place-items-center rounded transition-colors relative group",
        active ? "bg-accent text-bg-0" : "text-ink-2 hover:text-ink-0 hover:bg-line-1"
      )}
    >
      {icon}
      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-bg-3 text-ink-0 text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-line-2 font-mono uppercase tracking-[0.12em]">
        {label}
      </span>
    </button>
  );
}

function LegendRow({ color, label, glow }: { color: string; label: string; glow?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-ink-2 text-[10.5px] tracking-[-0.005em]">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color, boxShadow: glow ? `0 0 6px ${color}` : "none" }} />
      {label}
    </div>
  );
}

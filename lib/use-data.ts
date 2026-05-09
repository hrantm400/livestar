"use client";

import { useEffect, useState } from "react";
import { ActivityEvent, Celebrity } from "./types";
import type { CelebrityProfile, NewsArticle, Release, SourceStatus } from "./aggregator";

export type LiveProfile = CelebrityProfile;
export type LiveNews = NewsArticle;
export type LiveRelease = Release;
export type LiveSourceStatus = SourceStatus;
export type FeedEvent = ActivityEvent & { celebrityId: string; celebrityName: string };

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function load<T>(key: string, url: string): Promise<T> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as T);
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = fetch(url, { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<T>) : Promise.reject(new Error(String(r.status)))))
    .then((v) => {
      cache.set(key, v);
      inflight.delete(key);
      return v;
    })
    .catch((e) => {
      inflight.delete(key);
      throw e;
    });
  inflight.set(key, p);
  return p;
}

export function useCelebrities() {
  const [data, setData] = useState<Celebrity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load<{ celebrities: Celebrity[] }>("list", "/api/celebrities")
      .then((v) => {
        if (!cancelled) {
          setData(v.celebrities);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}

export function useProfile(id: string | null) {
  const [data, setData] = useState<LiveProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    load<LiveProfile>(`profile:${id}`, `/api/celebrity/${id}`)
      .then((v) => {
        if (!cancelled) {
          setData(v);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading, error };
}

export function useFeed(refreshMs = 60_000) {
  const [data, setData] = useState<FeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        // bypass our process-level cache so we re-pull
        cache.delete("feed");
        const v = await load<{ events: FeedEvent[] }>("feed", "/api/feed");
        if (!cancelled) {
          setData(v.events);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOnce();
    const t = setInterval(fetchOnce, refreshMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [refreshMs]);

  return { data, loading };
}

/** Bust the in-memory cache so a re-fetch hits the network. */
export function invalidate(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

/**
 * Kick off a profile fetch in the background — call this on hover so by the
 * time the user clicks, the data is in cache. Idempotent and non-throwing.
 */
export function prefetchProfile(id: string): void {
  if (!id) return;
  if (cache.has(`profile:${id}`)) return;
  if (inflight.has(`profile:${id}`)) return;
  load<LiveProfile>(`profile:${id}`, `/api/celebrity/${id}`).catch(() => {
    /* swallow — prefetch is best-effort */
  });
}

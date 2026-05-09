import { cached } from "../cache";
import { fetchJson } from "./_fetch";

const KEY = process.env.SPORTSDB_KEY || "3"; // "3" is the public test key
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

export interface SportsPlayer {
  id: string;
  teamId?: string;
  team?: string;
  name: string;
  sport?: string;
  thumb?: string;
  cutout?: string;
  bio?: string;
}

export interface SportsEvent {
  id: string;
  title: string;
  date: string; // ISO
  venue?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  past: boolean;
  league?: string;
}

/** Strip diacritics — TheSportsDB indexes ASCII names ("Mbappe" not "Mbappé"). */
function asciiize(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

async function lookupOnce(query: string): Promise<SportsPlayer | null> {
  const url = `${BASE}/searchplayers.php?p=${encodeURIComponent(query)}`;
  const data = await fetchJson<{ player?: Array<Record<string, string>> | null }>(url);
  const p = data?.player?.[0];
  if (!p) return null;
  return {
    id: p.idPlayer,
    teamId: p.idTeam,
    team: p.strTeam,
    name: p.strPlayer,
    sport: p.strSport,
    thumb: p.strThumb,
    cutout: p.strCutout,
    bio: p.strDescriptionEN,
  };
}

export async function findPlayer(name: string): Promise<SportsPlayer | null> {
  return cached(
    `sportsdb:player:${name}`,
    async () => {
      // Try the original first; if it has diacritics and misses, retry ASCII.
      const direct = await lookupOnce(name);
      if (direct) return direct;
      const ascii = asciiize(name);
      if (ascii !== name) {
        const fb = await lookupOnce(ascii);
        if (fb) return fb;
      }
      return null;
    },
    { ttl: 12 * 3600, swr: 48 * 3600 }
  );
}

function parseEventISO(date?: string, time?: string): string {
  if (!date) return new Date().toISOString();
  const dt = `${date}T${time || "00:00:00"}Z`;
  const d = new Date(dt);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

async function teamEvents(teamId: string, kind: "next" | "last"): Promise<SportsEvent[]> {
  const path = kind === "next" ? "eventsnext.php" : "eventslast.php";
  return cached(
    `sportsdb:${kind}:${teamId}`,
    async () => {
      const url = `${BASE}/${path}?id=${teamId}`;
      const data = await fetchJson<{ events?: Array<Record<string, string>> | null; results?: Array<Record<string, string>> | null }>(url, { timeoutMs: 10_000 });
      const items = (data?.events ?? data?.results ?? []) || [];
      return items.slice(0, 5).map((e): SportsEvent => ({
        id: `sportsdb-${e.idEvent}`,
        title: e.strEvent,
        date: parseEventISO(e.dateEvent, e.strTime),
        venue: e.strVenue,
        city: e.strCity || undefined,
        country: e.strCountry || undefined,
        league: e.strLeague || undefined,
        past: kind === "last",
      }));
    },
    { ttl: 600, swr: 1800 }
  );
}

export async function playerSchedule(name: string): Promise<{
  player: SportsPlayer | null;
  upcoming: SportsEvent[];
  recent: SportsEvent[];
}> {
  const player = await findPlayer(name);
  if (!player?.teamId) return { player, upcoming: [], recent: [] };
  const [upcoming, recent] = await Promise.all([
    teamEvents(player.teamId, "next"),
    teamEvents(player.teamId, "last"),
  ]);
  return { player, upcoming, recent };
}

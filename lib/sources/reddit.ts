import { cached } from "../cache";
import { fetchJson } from "./_fetch";

export interface RedditMention {
  id: string;
  title: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  comments: number;
  createdAt: string; // ISO
  author: string;
}

interface RawReddit {
  data?: {
    children?: Array<{
      data: {
        id: string;
        title: string;
        subreddit: string;
        url: string;
        permalink: string;
        score: number;
        num_comments: number;
        created_utc: number;
        author: string;
        over_18?: boolean;
      };
    }>;
  };
}

export async function redditMentions(
  query: string,
  opts: { limit?: number; window?: "hour" | "day" | "week" } = {}
): Promise<RedditMention[]> {
  const limit = opts.limit ?? 8;
  const window = opts.window ?? "day";
  return cached(
    `reddit:${query}:${window}:${limit}`,
    async () => {
      const q = query.includes(" ") ? `"${query}"` : query;
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
        q
      )}&sort=new&limit=${limit}&t=${window}`;
      const data = await fetchJson<RawReddit>(url, {
        headers: { Accept: "application/json" },
        timeoutMs: 8_000,
      });
      const children = data?.data?.children ?? [];
      return children
        .map((c) => c.data)
        .filter((d) => !d.over_18)
        .slice(0, limit)
        .map((d): RedditMention => ({
          id: d.id,
          title: d.title,
          subreddit: d.subreddit,
          url: d.url,
          permalink: `https://reddit.com${d.permalink}`,
          score: d.score,
          comments: d.num_comments,
          createdAt: new Date(d.created_utc * 1000).toISOString(),
          author: d.author,
        }));
    },
    { ttl: 180, swr: 600 }
  );
}

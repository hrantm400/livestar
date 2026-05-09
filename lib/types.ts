export type Category = "music" | "film" | "sports" | "business" | "fashion";

export type EventType = "past" | "now" | "soon";

export type Source =
  | "Tour announcement"
  | "Festival lineup"
  | "Ticketmaster"
  | "Live Nation"
  | "Press release"
  | "Verified press"
  | "Official social"
  | "Public schedule"
  | "Reuters"
  | "AP News"
  | "Variety"
  | "Vogue"
  | "Billboard"
  | "BBC"
  | "ESPN"
  | "TED"
  | "NBC"
  | "CBS"
  | "Universal"
  | "TMZ";

export interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  place: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** Human-readable, e.g. "38 min ago", "In 4 days" */
  when: string;
  /** ISO 8601 instant — used to keep `when` ticking */
  at: string;
  source: Source;
  detail?: string;
}

export interface Celebrity {
  id: string;
  name: string;
  handle: string;
  category: Category;
  initials: string;
  online: boolean;
  followers: string;
  bio: string;
  events: ActivityEvent[];
}

export const CATEGORY_COLORS: Record<Category, string> = {
  music: "#ec4899",
  film: "#a855f7",
  sports: "#10b981",
  business: "#3b82f6",
  fashion: "#f43f5e",
};

export const CATEGORY_GRADIENTS: Record<Category, string> = {
  music: "linear-gradient(135deg, #ec4899, #be185d)",
  film: "linear-gradient(135deg, #a855f7, #6d28d9)",
  sports: "linear-gradient(135deg, #10b981, #047857)",
  business: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  fashion: "linear-gradient(135deg, #f43f5e, #be123c)",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  music: "Music",
  film: "Film & TV",
  sports: "Sports",
  business: "Business",
  fashion: "Fashion",
};

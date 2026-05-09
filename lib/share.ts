"use client";

/**
 * Build a shareable URL for the currently-focused celebrity, then copy it
 * to the clipboard. Falls back to a manual prompt if clipboard is unavailable.
 */
export async function copyShareLink(celebrityId: string, celebrityName: string): Promise<string> {
  const url = new URL(window.location.href);
  url.searchParams.set("focus", celebrityId);
  const link = url.toString();
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    // older browsers / non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = link;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {
      /* ignore */
    }
    document.body.removeChild(ta);
  }
  void celebrityName;
  return link;
}

/** Replace the current URL `?focus=` param without reloading. */
export function updateFocusParam(celebrityId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (celebrityId) url.searchParams.set("focus", celebrityId);
  else url.searchParams.delete("focus");
  window.history.replaceState({}, "", url.toString());
}

/** Read current `?focus=` param at boot. */
export function readFocusParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get("focus");
}

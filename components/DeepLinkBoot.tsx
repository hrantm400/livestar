"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/store";
import { readFocusParam, updateFocusParam } from "@/lib/share";

/**
 * Hydrates the selected-celebrity from `?focus=` on first paint and keeps
 * the URL in sync as the user navigates. Renderless.
 */
export default function DeepLinkBoot() {
  const selectedId = useUI((s) => s.selectedId);
  const select = useUI((s) => s.select);

  // Read once on mount
  useEffect(() => {
    const focus = readFocusParam();
    if (focus) select(focus);
  }, [select]);

  // Mirror future selections to the URL
  useEffect(() => {
    updateFocusParam(selectedId);
  }, [selectedId]);

  return null;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the page from the server when the tab becomes visible, so changes made over MCP appear. */
export function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [router]);

  return null;
}

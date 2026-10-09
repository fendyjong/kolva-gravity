import { VERSION_AMBER_DAYS, VERSION_STALE_DAYS } from "@/lib/limits";
import type { Summary } from "@/lib/tasks/types";

/** `Next version N open · S over a week · oldest open Dd` (the last part only when something is open). */
export function formatSummary(summary: Summary): string {
  const parts = [`Next version ${summary.versionOpen} open`, `${summary.versionStale} over a week`];
  if (summary.oldestOpenDays !== null) parts.push(`oldest open ${summary.oldestOpenDays}d`);
  return parts.join(" · ");
}

/** Badge colour (spec rule 5): none below VERSION_AMBER_DAYS, amber up to VERSION_STALE_DAYS, red from there. */
export function carryOverTone(days: number): "amber" | "red" | null {
  if (days >= VERSION_STALE_DAYS) return "red";
  if (days >= VERSION_AMBER_DAYS) return "amber";
  return null;
}

/** `https://github.com/<owner>/<repo>/issues/<n>` → `<repo>#<n>`. */
export function issueLabel(url: string): string {
  const match = /^https:\/\/github\.com\/[^/]+\/([^/]+)\/issues\/(\d+)$/.exec(url);
  return match ? `${match[1]}#${match[2]}` : url;
}

/** `HH:mm` in the given time zone. */
export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

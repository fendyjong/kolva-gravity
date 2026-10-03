import type { Summary } from "@/lib/tasks/types";

/** `Today X/Y done · C carried over · oldest open Nd` (the last part only when something is open). */
export function formatSummary(summary: Summary): string {
  const parts = [
    `Today ${summary.doneToday}/${summary.totalToday} done`,
    `${summary.carriedOver} carried over`,
  ];
  if (summary.oldestOpenDays !== null) parts.push(`oldest open ${summary.oldestOpenDays}d`);
  return parts.join(" · ");
}

/** Carry-over badge colour: none at 0, amber at 1–2, red at 3 or more. */
export function carryOverTone(days: number): "amber" | "red" | null {
  if (days >= 3) return "red";
  if (days >= 1) return "amber";
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

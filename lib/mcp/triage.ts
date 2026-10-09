import { readFileSync } from "node:fs";
import { join } from "node:path";
import { VERSION_BUDGET, VERSION_STALE_DAYS } from "@/lib/limits";

// Shipped with the standalone build through outputFileTracingIncludes in next.config.ts.
const TEMPLATE = join(process.cwd(), "lib/mcp/triage.md");

/** The triage prompt (lib/mcp/triage.md) for an optional comma-separated `owner/repo` list. */
export function triagePrompt(repos?: string): string {
  const list = (repos ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
  const values: Record<string, string> = {
    repos: list.length > 0 ? `Repos to plan from: ${list.join(", ")}.` : "No repos were given: skip step 5.",
    budget: String(VERSION_BUDGET),
    stale_days: String(VERSION_STALE_DAYS),
  };
  // A function replacement, so `$` in a repo name is never read as a replacement pattern.
  return readFileSync(TEMPLATE, "utf8").replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}

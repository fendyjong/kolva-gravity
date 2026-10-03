import { readFileSync } from "node:fs";
import { join } from "node:path";

// Shipped with the standalone build through outputFileTracingIncludes in next.config.ts.
const TEMPLATE = join(process.cwd(), "lib/mcp/triage.md");

/** The triage prompt (lib/mcp/triage.md) for an optional comma-separated `owner/repo` list. */
export function triagePrompt(repos?: string): string {
  const list = (repos ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
  const reposLine =
    list.length > 0
      ? `Repos to shortlist issues from: ${list.join(", ")}.`
      : "No repos were given: skip step 5.";
  return readFileSync(TEMPLATE, "utf8").replace("{{repos}}", reposLine);
}

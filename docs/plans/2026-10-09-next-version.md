# Next Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use pitcall:wave-driven-development
> to implement this plan wave by wave. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn quadrant 1 from "Do today" into "Next version" — the checklist for the next release — and rewrite the `triage` prompt so it fills that checklist with every urgent issue plus the next slice of each repo's version milestone, within a 10-point budget.

**Architecture:** No schema, migration or tool changes. The page changes are a rename, new badge thresholds, a new summary line and a removed warning, all driven by three constants in `lib/limits.ts`. The triage behaviour lives entirely in the prompt text `lib/mcp/triage.md`, which `lib/mcp/triage.ts` fills with the repos line and the same constants, so the page and the prompt cannot disagree.

**Tech Stack:** Next.js 16.3.8 (App Router), React 19.2, Tailwind CSS 4, TypeScript 5, `node:sqlite`, Vitest 5, Playwright, `@modelcontextprotocol/server` v2 with zod 4, pnpm 11.

**Spec:** `docs/specs/2026-10-09-next-version.md` (a verbatim copy of the approved spec comment on issue #10, https://github.com/fendyjong/kolva-gravity/issues/10#issuecomment-6077820320). It builds on `docs/specs/2026-10-02-gravity-v1.md` (version 3). Read the new spec beside this plan; where they disagree, the spec wins.

## Global Constraints

- **Next.js 16 is not the Next.js you know.** Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).
- **A fresh worktree has no `node_modules`.** Run `pnpm install --frozen-lockfile` before any test. pnpm only; no task adds or changes a dependency, so `package.json` and `pnpm-lock.yaml` never change.
- **No schema change, no migration, no new MCP tool.** The MCP server keeps exactly 8 tools and one prompt, `triage`, with one optional argument `repos`. The app never talks to GitHub.
- **Quadrants:** 1 `Next version` (top-left), 2 `Schedule`, 3 `Delegate`, 4 `Later`. Priority 1 > 2 > 3 > 4.
- **Constants in `lib/limits.ts`:** `VERSION_BUDGET = 10`, `VERSION_AMBER_DAYS = 5`, `VERSION_STALE_DAYS = 7`, `VISIBLE_PER_QUADRANT = 5` (unchanged). `Q1_WARN` is deleted.
- **Badge (rule 5):** nothing below `VERSION_AMBER_DAYS`, amber from `VERSION_AMBER_DAYS` up to `VERSION_STALE_DAYS`, red at `VERSION_STALE_DAYS` or more (0–4 nothing, 5–6 amber, 7+ red). Text `Nd in version`, label `In Next version`. `carry_over_days` keeps its name everywhere.
- **Summary line:** `Next version N open · S over a week · oldest open Dd`; the `oldest open` part is left out when nothing is open. `Summary` is `{ versionOpen: number; versionStale: number; oldestOpenDays: number | null }`.
- **Rule 13:** quadrant 1 always shows every open task and shows no warning, however many there are.
- **Unchanged:** quadrants 2–4, the Done today list, and rules 1–4 and 6–12.
- **Triage prompt placeholders:** `{{repos}}` → `Repos to plan from: <a>, <b>.` or `No repos were given: skip step 5.`; `{{budget}}` → `VERSION_BUDGET`; `{{stale_days}}` → `VERSION_STALE_DAYS`. Every occurrence is filled; no `{{` is left.
- **Triage only reads GitHub.** The prompt never tells the LLM to change an issue, label or milestone.
- **Tests:** Vitest files named `*.test.ts` next to the code they test; Playwright files in `e2e/`. `pnpm validate` is the one command that says a change is good. The Playwright server uses port 17017 (portctl's claim for `gravity-e2e`); never pick a port by hand.
- **RED means an assertion failed.** A RED step that fails only because a module or export is missing proves nothing; stub it (export present, wrong value) and quote the assertion failure as RED evidence.
- **Tooling ignores nested worktrees.** Task worktrees live under `.claude/worktrees/`; `tsconfig.json`, ESLint and Vitest already exclude `.claude/`.

---

## File structure

| file | responsibility | task |
|---|---|---|
| `lib/limits.ts` | the visibility and Next-version constants | 1 |
| `lib/quadrants.ts` | quadrant names | 1 |
| `lib/format.ts`, `lib/format.test.ts` | summary line and badge tone | 1 |
| `lib/tasks/types.ts` | the `Summary` type | 1 |
| `lib/tasks/store.ts`, `lib/tasks/store.test.ts` | `getSummary` | 1 |
| `components/Quadrant.tsx` | quadrant header without the warning | 1 |
| `components/TaskRow.tsx` | the `Nd in version` badge | 1 |
| `app/layout.tsx` | page metadata description | 1 |
| `e2e/matrix.spec.ts` | quadrant 1 found as `Next version` | 1 |
| `lib/mcp/triage.md` | the triage prompt text | 2 |
| `lib/mcp/triage.ts`, `lib/mcp/triage.test.ts` | fills the prompt's placeholders | 2 |
| `lib/mcp/server.ts`, `lib/mcp/server.test.ts` | MCP descriptions mentioning quadrant 1 and triage | 2 |
| `README.md` | intro and Triage section | 3 |
| `docs/specs/2026-10-02-gravity-v1.md` | v1 spec bumped to version 4 | 3 |

---

### Task 1: Next version on the page — constants, badge, summary line, no warning

**Files:**
- Modify: `lib/limits.ts`
- Modify: `lib/quadrants.ts`
- Modify: `lib/format.ts`
- Modify: `lib/tasks/types.ts`
- Modify: `lib/tasks/store.ts`
- Modify: `components/Quadrant.tsx`
- Modify: `components/TaskRow.tsx`
- Modify: `app/layout.tsx`
- Modify: `e2e/matrix.spec.ts`
- Test: `lib/format.test.ts`
- Test: `lib/tasks/store.test.ts`

**Interfaces:**
- Depends: none
- Model: standard
- Produces: `VERSION_BUDGET`, `VERSION_AMBER_DAYS`, `VERSION_STALE_DAYS` (all `number`) exported from `lib/limits.ts`; `Summary` = `{ versionOpen: number; versionStale: number; oldestOpenDays: number | null }` in `lib/tasks/types.ts`. Task 2 imports `VERSION_BUDGET` and `VERSION_STALE_DAYS` from `@/lib/limits`.

- [ ] **Step 0: Install dependencies**

Run: `pnpm install --frozen-lockfile`
Expected: completes without changing `package.json` or `pnpm-lock.yaml`.

- [ ] **Step 1: Write the failing tests for the badge tone and the summary line**

In `lib/format.test.ts`, replace the `formatSummary` and `carryOverTone` describe blocks with:

```ts
describe("formatSummary", () => {
  it("formats the full summary line", () => {
    expect(formatSummary({ versionOpen: 6, versionStale: 1, oldestOpenDays: 12 })).toBe(
      "Next version 6 open · 1 over a week · oldest open 12d",
    );
  });

  it("leaves out oldest open when nothing is open", () => {
    expect(formatSummary({ versionOpen: 0, versionStale: 0, oldestOpenDays: null })).toBe(
      "Next version 0 open · 0 over a week",
    );
  });
});

describe("carryOverTone", () => {
  it("shows nothing below 5 days, amber at 5–6 and red at 7 or more", () => {
    expect(carryOverTone(0)).toBeNull();
    expect(carryOverTone(4)).toBeNull();
    expect(carryOverTone(5)).toBe("amber");
    expect(carryOverTone(6)).toBe("amber");
    expect(carryOverTone(7)).toBe("red");
    expect(carryOverTone(40)).toBe("red");
  });
});
```

Leave the `issueLabel` and `formatTime` blocks as they are.

- [ ] **Step 2: Write the failing tests for `getSummary`**

In `lib/tasks/store.test.ts`, inside `describe("done today and the summary", ...)`, replace the two summary tests (`"counts X/Y done, carried over, and the oldest open age"` and `"leaves oldestOpenDays null when nothing is open"`) with:

```ts
  it("counts open Next version tasks, those in it 7 days or more, and the oldest open age", () => {
    at("2026-09-26T16:59:00.000Z"); // 23:59 WIB, 26 Sep: 7 local days before 3 Oct
    add("seven days", 1);
    at("2026-09-26T17:01:00.000Z"); // 00:01 WIB, 27 Sep: 6 local days before 3 Oct
    add("six days", 1);
    at(START);
    add("fresh", 1);
    const done = add("done", 1);
    add("elsewhere", 3);
    store.complete(done.id);
    expect(store.getSummary()).toEqual({
      versionOpen: 3,
      versionStale: 1,
      oldestOpenDays: 7,
    });
  });

  it("leaves oldestOpenDays null when nothing is open", () => {
    expect(store.getSummary()).toEqual({
      versionOpen: 0,
      versionStale: 0,
      oldestOpenDays: null,
    });
  });
```

Leave the `"lists tasks completed on today's local date..."` test as it is.

- [ ] **Step 3: Run the tests to verify they fail on assertions**

Run: `pnpm vitest run lib/format.test.ts lib/tasks/store.test.ts`
Expected: FAIL — `formatSummary` returns `Today undefined/undefined done ...`, `carryOverTone(4)` returns `"red"`, and `getSummary` returns `doneToday`/`totalToday`/`carriedOver` keys. Quote these assertion failures as RED evidence.

- [ ] **Step 4: Write `lib/limits.ts`**

Replace the whole file with:

```ts
/** Spec rule 13: quadrants 2–4 show this many tasks, then a "+N more" toggle. Quadrant 1 always shows every task. */
export const VISIBLE_PER_QUADRANT = 5;

/** Spec rule 5: a quadrant-1 task's badge turns amber after this many local days in Next version. */
export const VERSION_AMBER_DAYS = 5;

/**
 * Spec rule 5: the badge turns red at this many days, and triage takes the task out unless it is urgent.
 * The summary line calls these tasks "over a week", which assumes 7.
 */
export const VERSION_STALE_DAYS = 7;

/** The triage prompt adds roadmap work only while Next version's points stay within this. */
export const VERSION_BUDGET = 10;
```

- [ ] **Step 5: Write `lib/format.ts`'s summary and tone**

Replace the import line, `formatSummary` and `carryOverTone` (keep `issueLabel` and `formatTime` unchanged):

```ts
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
```

- [ ] **Step 6: Write the `Summary` type**

In `lib/tasks/types.ts`, replace the `Summary` interface with:

```ts
/** The summary line: `Next version N open · S over a week · oldest open Dd`. */
export interface Summary {
  /** N: open quadrant-1 tasks. */
  versionOpen: number;
  /** S: open quadrant-1 tasks with a carry-over of VERSION_STALE_DAYS or more. */
  versionStale: number;
  /** D: the largest age among open tasks; null when nothing is open. */
  oldestOpenDays: number | null;
}
```

- [ ] **Step 7: Write `getSummary`**

In `lib/tasks/store.ts`, add `import { VERSION_STALE_DAYS } from "@/lib/limits";` above `import { localDate, localDaysBetween } from "./dates";`, and replace `getSummary()` with:

```ts
    getSummary() {
      const open = getMatrix();
      const version = open.filter((task) => task.quadrant === 1);
      return {
        versionOpen: version.length,
        versionStale: version.filter((task) => task.carry_over_days >= VERSION_STALE_DAYS).length,
        oldestOpenDays: open.length === 0 ? null : Math.max(...open.map((task) => task.age_days)),
      };
    },
```

`getSummary` no longer calls `getDoneToday`; `getDoneToday` itself stays (the page still uses it).

- [ ] **Step 8: Run the unit tests to verify they pass**

Run: `pnpm vitest run lib/format.test.ts lib/tasks/store.test.ts`
Expected: PASS.

- [ ] **Step 9: Rename quadrant 1, drop the warning, reword the badge and the page description**

`lib/quadrants.ts`: change `{ id: 1, name: "Do today" }` to `{ id: 1, name: "Next version" }`.

`components/Quadrant.tsx`: change the limits import to `import { VISIBLE_PER_QUADRANT } from "@/lib/limits";` and delete this block from the header:

```tsx
        {first && tasks.length > Q1_WARN && (
          <span className="text-sm font-medium text-red-700 dark:text-red-400">
            Over {Q1_WARN} — move some down
          </span>
        )}
```

Keep the `first` variable: it still sets quadrant 1's styling and skips the "+N more" limit.

`components/TaskRow.tsx`: replace the carry-over badge with:

```tsx
            {tone && (
              <Badge label="In Next version" tone={tone}>
                {task.carry_over_days}d in version
              </Badge>
            )}
```

`app/layout.tsx`: set `description: "A priority matrix whose top-left quadrant is the checklist for the next version.",`.

- [ ] **Step 10: Point the Playwright spec at Next version**

In `e2e/matrix.spec.ts`, replace every `"Do today"` with `"Next version"` and `"Add task to Do today"` with `"Add task to Next version"` (four strings in all), and rename the local variable `today` to `version` in the two tests that use it so the names match the quadrant. Leave `region(page, "Done today")` untouched — that is the Done today list, which keeps its name.

- [ ] **Step 11: Run the whole validation**

Run: `pnpm validate`
Expected: lint, typecheck, every Vitest file and both Playwright projects pass. `grep -rn "Q1_WARN\|Do today\|doneToday\|totalToday\|carriedOver" --include='*.ts' --include='*.tsx' app components lib e2e` prints nothing.

- [ ] **Step 12: Commit**

```bash
git add lib/limits.ts lib/quadrants.ts lib/format.ts lib/format.test.ts lib/tasks/types.ts lib/tasks/store.ts lib/tasks/store.test.ts components/Quadrant.tsx components/TaskRow.tsx app/layout.tsx e2e/matrix.spec.ts
git commit -m "feat(ui): quadrant 1 is Next version, with a weekly badge and no warning"
```

---

### Task 2: The triage prompt plans the next version

**Files:**
- Modify: `lib/mcp/triage.md`
- Modify: `lib/mcp/triage.ts`
- Modify: `lib/mcp/server.ts`
- Test: `lib/mcp/triage.test.ts`
- Test: `lib/mcp/server.test.ts`

**Interfaces:**
- Depends: 1
- Model: standard
- Consumes: `VERSION_BUDGET` and `VERSION_STALE_DAYS` from `@/lib/limits` (Task 1) — `triagePrompt` fills them into the template.
- Produces: `triagePrompt(repos?: string): string` (signature unchanged).

- [ ] **Step 0: Install dependencies**

Run: `pnpm install --frozen-lockfile`

- [ ] **Step 1: Write the failing prompt tests**

Replace the whole `describe("triagePrompt", ...)` block in `lib/mcp/triage.test.ts`, and add the `vi` import and the module mock at the top. The mock gives the constants values that appear nowhere else in the prompt, so the test proves they come from `lib/limits.ts` rather than being typed into `triage.md`:

```ts
import type { Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "@/lib/db";
import { createTaskStore } from "@/lib/tasks";
import { connectTestClient } from "./test-client";
import { triagePrompt } from "./triage";

vi.mock("@/lib/limits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/limits")>()),
  VERSION_BUDGET: 13,
  VERSION_STALE_DAYS: 9,
}));

describe("triagePrompt", () => {
  it("names the repos to plan from and leaves no placeholder", () => {
    const text = triagePrompt(" fendyjong/ai-automatic-engagement , fendyjong/kolva-gravity ");
    expect(text).toContain("Repos to plan from: fendyjong/ai-automatic-engagement, fendyjong/kolva-gravity.");
    expect(text).not.toContain("{{");
  });

  it("skips the repo step when no repos are given", () => {
    expect(triagePrompt()).toContain("No repos were given: skip step 5.");
    expect(triagePrompt("  ")).toContain("No repos were given: skip step 5.");
  });

  it("fills the budget and the stale threshold from lib/limits.ts", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain("stays within 13.");
    expect(text).toContain("points used out of 13");
    expect(text).toContain("`carry_over_days` is 9 or more");
    expect(text).toContain("urgent tasks at 9 or more days");
    expect(text).not.toContain("{{");
  });

  it("describes quadrant 1 as Next version and only reads GitHub", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain('Quadrant 1, "Next version", is the checklist of everything to finish before the next release.');
    expect(text).toContain("Gravity knows nothing about deployments.");
    expect(text).toContain("Never change an issue, label or milestone.");
    expect(text).not.toContain("Do today");
  });

  it("keeps each issue to one task and never splits an issue-linked task", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain(
      "An issue is exactly one task. Never add a task without `issue_url` for work on an issue that already has a task.",
    );
    expect(text).toContain("A task with an `issue_url` is never split.");
  });

  it("defines urgency, points and the budget", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain("an issue whose title contains `URGENT` (any case)");
    expect(text).toContain("`size:S` = 1, `size:M` = 2, `size:L` = 4");
    expect(text).toContain("Urgent issues are added regardless, and nothing is moved out of quadrant 1 to make room.");
  });

  it("covers the spec's eight steps in order", () => {
    const text = triagePrompt("o/r");
    const markers = [
      "1. **Read**",
      "2. **Check GitHub.**",
      "3. **Stale tasks.**",
      "4. **Put-off tasks.**",
      "5. **Fill from the repos.**",
      "**5a. Urgent issues, without limit.**",
      "**5b. Roadmap issues, within the budget.**",
      "6. **Top up from Schedule.**",
      "7. **Reorder**",
      "8. **Summary.**",
    ];
    const positions = markers.map((marker) => text.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
```

In the same file's `describe("the triage prompt over MCP", ...)` block, change the expected text in `"returns the prompt text as one user message"` to `"Repos to plan from: o/r."`, and add this test to that block:

```ts
  it("describes the prompt as planning the next version", async () => {
    const { prompts } = await client.listPrompts();
    const triage = prompts.find((prompt) => prompt.name === "triage");
    expect(triage?.description).toBe(
      "Plan the next version: complete tasks whose issues closed, take stale work out, add every urgent issue and the next slice of each repo's version milestone.",
    );
  });
```

- [ ] **Step 2: Write the failing MCP description test**

In `lib/mcp/server.test.ts`, add this test inside `describe("gravity MCP tools", ...)`:

```ts
  it("describes quadrant 1 as Next version", async () => {
    const { tools } = await client.listTools();
    const quadrant = (name: string) =>
      (tools.find((tool) => tool.name === name)?.inputSchema.properties?.quadrant as { description?: string })
        ?.description;
    const expected =
      "1 = Next version (the checklist for the next release), 2 = Schedule, 3 = Delegate, 4 = Later. Priority 1 > 2 > 3 > 4.";
    expect(quadrant("add_task")).toBe(expected);
    expect(quadrant("move_task")).toBe(expected);
    expect(tools.find((tool) => tool.name === "get_matrix")?.description).toContain(
      "carry_over_days counts the local days a quadrant-1 task has been in Next version",
    );
  });
```

- [ ] **Step 3: Run the tests to verify they fail on assertions**

Run: `pnpm vitest run lib/mcp/triage.test.ts lib/mcp/server.test.ts`
Expected: FAIL — the prompt still says `Repos to shortlist issues from`, has no `stays within 13.`, and the quadrant description still reads `1 = Do today (everything here is due today), ...`. Quote these assertion failures as RED evidence.

- [ ] **Step 4: Rewrite `lib/mcp/triage.md`**

Replace the whole file with exactly this text:

````markdown
You are triaging Gravity, a priority matrix with no due dates. Quadrant 1, "Next version", is the checklist of everything to finish before the next release. The user deploys by hand, at least once a week. Gravity knows nothing about deployments. One batch covers every repo. Quadrant 2 is "Schedule", 3 is "Delegate" and 4 is "Later". Priority runs 1 > 2 > 3 > 4, and within a quadrant position 0 is the top.

Use the gravity MCP tools for every change, and `gh` only to read GitHub. Never change an issue, label or milestone. An issue is exactly one task. Never add a task without `issue_url` for work on an issue that already has a task.

{{repos}}

Definitions:

- **Urgent**: an issue whose title contains `URGENT` (any case), or an issue labelled `bug` that, judging by its title and body, is hurting production. A task without an issue is urgent when its description contains `URGENT`.
- **Points**: `size:S` = 1, `size:M` = 2, `size:L` = 4. An issue with no size label, and a task without an issue, count 2.
- **Points used** is the sum of the points of the open quadrant-1 tasks at that moment, so urgent issues and the user's own tasks count toward it.
- **Budget**: roadmap work (steps 5b and 6) is added only while points used, including the task being added, stays within {{budget}}. Urgent issues are added regardless, and nothing is moved out of quadrant 1 to make room.
- **Adding an issue** means `add_task` with the issue title as the description (one line, cut to 200 characters), quadrant 1, and the issue URL as `issue_url`. When it returns `existing: true`: a task open in quadrant 1 needs nothing; a task open in another quadrant is moved up to quadrant 1 with `move_task`; a completed or dropped task is left alone and named in the summary.

Work through these steps in order:

1. **Read** every open task with `get_matrix`.
2. **Check GitHub.** For each open task with an `issue_url`, in any quadrant, run `gh issue view <issue_url> --json state,title,labels`. Complete the task with `complete_task` when the issue is closed. Keep each issue's labels and title for points and urgency.
3. **Stale tasks.** For each quadrant-1 task whose `carry_over_days` is {{stale_days}} or more:
   - urgent: it stays, and the summary names it as holding up the version;
   - not urgent, with an `issue_url`: move it to quadrant 2 with `move_task`. A task with an `issue_url` is never split.
   - without an `issue_url`: split it into smaller tasks (add each part to quadrant 1 with `add_task`, then drop the original with `drop_task`), or move it to quadrant 2.
4. **Put-off tasks.** A task in quadrant 3 or 4 with a large `age_days`, or `demotions` of 1 or more, moves up one quadrant with `move_task`. This step never moves a task into quadrant 1.
5. **Fill from the repos.**
   - **5a. Urgent issues, without limit.** For each repo, run `gh issue list --repo <owner/repo> --state open --search "URGENT in:title" --limit 100 --json number,title,url,labels` and `gh issue list --repo <owner/repo> --state open --label bug --limit 200 --json number,title,url,labels`. Read a bug with `gh issue view <url> --json body` when its title alone does not show whether production is hurt. Add every urgent issue.
   - **5b. Roadmap issues, within the budget.**
     - **Version milestones.** Run `gh api "repos/<owner/repo>/milestones?state=open&per_page=100"`. A version milestone's title starts with `v` and a digit, e.g. `v1.x.x - Modular Monolith`. Order them by the leading version compared part by part, with `x` counting as 0 (`v1.x.x` comes before `v1.1.x`), then by milestone number.
     - **Candidates** are the open issues of the repo's first version milestone: `gh api "repos/<owner/repo>/issues?milestone=<number>&state=open&per_page=100"`, which returns labels, body, `sub_issues_summary` and `issue_dependencies_summary`. Entries with a `pull_request` field are pull requests; ignore them. When every open issue of a milestone is skipped or already in quadrant 1, the repo's next version milestone supplies candidates.
     - **Skip** an issue that is labelled `status:blocked` or `status:draft`; that is blocked by an open issue not in quadrant 1 (`issue_dependencies_summary.blocked_by` above 0, with the blockers from `gh api repos/<owner/repo>/issues/<number>/dependencies/blocked_by`, or `depends on #N` in its body with #N open); or whose task is completed or dropped. An issue with open sub-issues (`sub_issues_summary.completed` below `sub_issues_summary.total`) is never added: its open sub-issues, from `gh api repos/<owner/repo>/issues/<number>/sub_issues`, are candidates in its place, in that order.
     - **Order**: an issue before the issues that depend on it, then the lowest issue number. An issue whose task has `demotions` of 1 or more goes after every other candidate in its milestone.
     - **A repo with no version milestone** supplies candidates you pick from `gh issue list --repo <owner/repo> --state open --limit 200 --json number,title,url,labels,updatedAt` by labels, size and recency, with the same skips. A repo that has version milestones never takes roadmap issues from any other milestone or from issues without one.
     - **Turns**: take one candidate per repo per turn, in the order the repos are listed. Add a candidate when it fits the budget. When one does not fit, that repo is done for this run. Stop when every repo is done.
6. **Top up from Schedule.** In order from the top, move open quadrant-2 tasks into quadrant 1 with `move_task` while they fit the budget, skipping any task moved out of quadrant 1 in this run. Stop at the first that does not fit. This step runs even when no repos were given.
7. **Reorder** each quadrant with `reorder_quadrant`, most important first. Its `ids` must be exactly the open tasks in that quadrant, so call `get_matrix` again first. Quadrant 1: urgent tasks first, then dependencies before the tasks that depend on them, then the rest.
8. **Summary.** Finish with a short summary of:
   - which tasks were completed because their issues closed;
   - what moved out of Next version, and why;
   - what was added, and why (urgent, which milestone, picked, or from Schedule);
   - points used out of {{budget}};
   - urgent tasks at {{stale_days}} or more days, holding up the version;
   - open issues whose tasks are completed or dropped in Gravity;
   - issue-linked tasks moved out in this run that had been moved out before (`demotions` was already 1 or more): suggest splitting the issue on GitHub.
````

Note: the test expects `urgent tasks at 9 or more days` with the mocked value, which this text yields from `urgent tasks at {{stale_days}} or more days`.

- [ ] **Step 5: Fill every placeholder in `lib/mcp/triage.ts`**

Replace the whole file with:

```ts
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
```

- [ ] **Step 6: Reword the MCP descriptions in `lib/mcp/server.ts`**

- `quadrantField`'s `.describe(...)`: `"1 = Next version (the checklist for the next release), 2 = Schedule, 3 = Delegate, 4 = Later. Priority 1 > 2 > 3 > 4."`
- `get_matrix`'s description: `"Every open task, ordered by quadrant then position, with no visibility limit. carry_over_days counts the local days a quadrant-1 task has been in Next version; demotions counts moves to a lower-priority quadrant."`
- The `triage` prompt's `description`: `"Plan the next version: complete tasks whose issues closed, take stale work out, add every urgent issue and the next slice of each repo's version milestone."`

Leave the `repos` argument, its description, and everything else unchanged.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run lib/mcp/triage.test.ts lib/mcp/server.test.ts`
Expected: PASS.

- [ ] **Step 8: Run the whole validation**

Run: `pnpm validate`
Expected: everything passes, including both Playwright projects.

- [ ] **Step 9: Commit**

```bash
git add lib/mcp/triage.md lib/mcp/triage.ts lib/mcp/triage.test.ts lib/mcp/server.ts lib/mcp/server.test.ts
git commit -m "feat(mcp): triage plans the next version from urgent issues and the version milestone"
```

---

### Task 3: Docs — README and the v1 spec at version 4

**Files:**
- Modify: `README.md`
- Modify: `docs/specs/2026-10-02-gravity-v1.md`

**Interfaces:**
- Depends: none
- Model: standard
- Produces: documentation only; nothing imports it.

This task changes prose only. Its "test" is the checks in Step 4.

- [ ] **Step 1: Rewrite the README intro and Triage section**

In `README.md`, replace the first paragraph under `# Gravity` with:

```markdown
A one-person priority matrix with no due dates. Every task sits in one of four quadrants, and the top-left one — **Next version** — is the checklist of everything to finish before your next release. An LLM plans it on demand over MCP.
```

Replace the whole `## Triage` section (from `## Triage` to the end of the file) with:

````markdown
## Triage

Quadrant 1, **Next version**, is the checklist for your next release. Gravity knows nothing about deployments: you tick the list off and deploy by hand, at least once a week. Triage keeps the list current and small.

With the `gravity` MCP server added to Claude Code (see above), run:

```
/mcp__gravity__triage fendyjong/ai-automatic-engagement,fendyjong/kolva-gravity
```

The one argument, `repos`, is an optional comma-separated `owner/repo` list. The prompt (`lib/mcp/triage.md`) has the LLM:

1. read the matrix;
2. complete tasks whose issues have closed;
3. deal with tasks 7 days or more in Next version: urgent ones stay, issue-linked ones move to Schedule, others are split or moved down;
4. move up tasks in Delegate and Later that keep getting put off;
5. add every urgent issue from `repos` (`URGENT` in the title, or a `bug` hurting production), then the next issues of each repo's earliest open version milestone (e.g. `v1.x.x - …`), in dependency order, while Next version stays within a **10-point** budget (`size:S` 1, `size:M` 2, `size:L` 4, unsized 2);
6. top up from Schedule while the budget allows;
7. reorder every quadrant;
8. finish with a short summary, including points used.

Running it again creates no duplicates. Triage only reads GitHub; it never changes issues, labels or milestones. The budget and the 7-day threshold are constants in `lib/limits.ts`. Steps 2 and 5 need the `gh` CLI, logged in, wherever the LLM runs.
````

- [ ] **Step 2: Bump the v1 spec header and Goal**

In `docs/specs/2026-10-02-gravity-v1.md`:

Replace the three lines `**Version:** 3`, `**Changes since 2:** ...`, `**Status:** approved (2026-10-05)` with:

```markdown
**Version:** 4
**Changes since 3:** quadrant 1 is **Next version**, the checklist for the next release, and the `triage` prompt plans it (spec: `docs/specs/2026-10-09-next-version.md`, issue #10). Rules 5 and 13, the summary line, the task-row badge and the `triage` prompt section changed; the quadrant-1 warning is gone.
**Status:** approved (2026-10-09)
```

In `## Goal`, replace the sentences from `The top-left quadrant is a commitment:` to the end of the paragraph with:

```markdown
The top-left quadrant, **Next version**, is the checklist of everything to finish before the user's next release. The user deploys by hand, at least once a week, and Gravity knows nothing about deployments. When the user asks, an LLM plans the next version over MCP: it completes tasks whose issues closed, takes stale work out, and adds every urgent GitHub issue plus the next slice of each repo's version milestone.
```

In `## Non-goals (v1)`, append ` · a record of deployments or releases` before the final period.

- [ ] **Step 3: Update the quadrant, rules, UI and triage sections of the v1 spec**

In the same file:

1. Quadrants table: change `| 1 | Do today | top-left |` to `| 1 | Next version | top-left |`.
2. Replace rule 5 with:

```markdown
5. **Local dates** use the timezone in `APP_TZ` (default `Asia/Jakarta`). The **carry-over** of an open quadrant-1 task is the number of local days from the date of `q1_since` to today: how long it has been in Next version. The badge shows nothing below `VERSION_AMBER_DAYS`, amber from `VERSION_AMBER_DAYS` up to `VERSION_STALE_DAYS`, and red at `VERSION_STALE_DAYS` or more (with today's values: nothing at 0–4, amber at 5–6, red at 7+). Nothing runs at midnight; carry-over is computed when read.
```

3. Replace rule 13 with:

```markdown
13. **Visibility limits** live as constants in one file. Quadrant 1 always shows every open task and shows no warning, however many there are. Quadrants 2–4 show their top 5 (`VISIBLE_PER_QUADRANT = 5`) followed by a "+N more" toggle that shows the rest in place. The toggle state lives only in the browser and is not saved.
```

4. In `### Layout`, replace the `**Summary line**` bullet and its four sub-bullets with:

```markdown
- **Summary line** at the top: `Next version N open · S over a week · oldest open Dd`.
  - N = the number of open quadrant-1 tasks.
  - S = open quadrant-1 tasks with a carry-over of `VERSION_STALE_DAYS` (7) or more.
  - D = the largest age among open tasks. The `oldest open` part is left out when nothing is open.
```

5. In the `**Quadrant header**` bullet, delete the sentence `Quadrant 1 adds the over-limit warning.`
6. In `### Task row`, change the badge bullet `carry-over (quadrant 1 only, amber or red)` to `` days in Next version (quadrant 1 only, amber or red), e.g. `5d in version` ``.
7. Under the heading ``### `triage` prompt`` (inside `## MCP`), replace everything from the line after that heading up to the next `## ` heading with:

```markdown
The server exposes an MCP prompt named `triage` with one optional argument, `repos`: a comma-separated list of `owner/repo`. Claude Code shows it as `/mcp__gravity__triage`. The text lives in the repo (`lib/mcp/triage.md`), and `triagePrompt` fills its `{{repos}}`, `{{budget}}` (`VERSION_BUDGET` = 10) and `{{stale_days}}` (`VERSION_STALE_DAYS` = 7) placeholders. The full step-by-step behaviour is specified in `docs/specs/2026-10-09-next-version.md`; in short, the prompt states that an issue is exactly one task and that triage only reads GitHub, defines urgency, points (`size:S` 1, `size:M` 2, `size:L` 4, otherwise 2) and the budget, and tells the LLM to:

1. Call `get_matrix`.
2. Complete each task whose issue is closed (`gh issue view`).
3. Deal with every quadrant-1 task at `VERSION_STALE_DAYS` or more: urgent stays; non-urgent with an `issue_url` moves to quadrant 2, never split; without one, split or move down.
4. Move put-off tasks in quadrants 3 and 4 up one quadrant, never into quadrant 1.
5. If `repos` is given, add every urgent issue regardless of the budget, then roadmap issues from each repo's earliest open version milestone, in dependency order and in turns across the repos, while quadrant 1's points stay within the budget. Rely on `add_task` returning the existing task to avoid duplicates.
6. Top up from quadrant 2 while the budget allows.
7. Reorder each quadrant with `reorder_quadrant`.
8. Finish with a short summary, including points used.
```

Leave every other section — data model, rules 1–4 and 6–12, MCP tools, Deploy, Testing and Work breakdown — as it is.

- [ ] **Step 4: Check the docs**

Run: `grep -n "Do today\|due today\|due \*\*today\|Q1_WARN\|over-limit" README.md docs/specs/2026-10-02-gravity-v1.md`
Expected: no output.

Run: `grep -n "at most 10" README.md docs/specs/2026-10-02-gravity-v1.md`
Expected: exactly one line, the Work breakdown row for `#7 (F)`, which records what v1 shipped and stays unchanged.

Run: `grep -c "Next version" README.md docs/specs/2026-10-02-gravity-v1.md`
Expected: a count of at least 2 for each file.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/specs/2026-10-02-gravity-v1.md
git commit -m "docs: Next version in the README and the v1 spec (version 4)"
```

---

## Waves

| Wave | Tasks | Rationale |
|---|---|---|
| 1 | 1, 3 | disjoint files; neither depends on anything (Task 3 is prose only) |
| 2 | 2 | imports the constants Task 1 adds to `lib/limits.ts` |

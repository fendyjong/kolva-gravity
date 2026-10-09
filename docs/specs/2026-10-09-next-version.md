# Spec: Next version — quadrant 1 becomes the release checklist, and triage fills it

**Version:** 1
**Status:** approved (2026-10-09)
**Work issue:** #10
**Builds on:** Gravity v1 (#1), spec version 3 in `docs/specs/2026-10-02-gravity-v1.md`

## Goal

Quadrant 1 stops meaning "due today" and becomes **Next version**: the checklist of everything to finish before the user's next release. The user checks it off and deploys by hand, at least once a week. Gravity never learns about deployments and stays a task list.

Each triage run keeps the checklist current and small: it completes tasks whose issues closed, takes stale non-urgent work out, adds every urgent issue, and adds the next slice of the roadmap milestone, so each app is upgraded in small increments.

## Non-goals

A record of deployments or releases, or any deploy button or tool · the app talking to GitHub · schema changes or migrations · new MCP tools · a size or count limit enforced by the app · one batch per repo (one batch spans every repo) · triage changing anything on GitHub · changes to quadrants 2–4, "Done today", or rules 1–4 and 6–12.

## Decisions

| question | decision |
|---|---|
| What is quadrant 1? | One "Next version" batch across all repos. |
| Does Gravity track deployments? | No. |
| How does triage choose? | Every urgent issue, then the next issues of the earliest open version milestone. |
| How big is a version? | Triage tops Next version up with roadmap work only while its points stay within 10. Urgent issues and the user's own tasks are never limited. |
| A task 7+ days in Next version | Urgent: stays. Non-urgent with an issue: moves to Schedule. Without an issue: split or moved down. |
| The quadrant-1 over-limit warning | Removed. A version can hold many tasks or a few. |

## App changes

No table, column, migration or tool is added or removed.

### Constants (`lib/limits.ts`)

| constant | value | used by |
|---|---|---|
| `VERSION_BUDGET` | 10 | the triage prompt: roadmap work is added only while Next version's points stay within it |
| `VERSION_AMBER_DAYS` | 5 | the badge turns amber |
| `VERSION_STALE_DAYS` | 7 | the badge turns red; the summary's "over a week"; the triage stale step |

`Q1_WARN` is deleted. `VISIBLE_PER_QUADRANT` is unchanged. A comment on `VERSION_STALE_DAYS` notes that the summary line's wording ("over a week") assumes 7.

### Quadrant 1

`lib/quadrants.ts` names quadrant 1 **Next version**. It stays top-left with the strongest visual weight.

### Rule 5, replaced

5. **Local dates** use the timezone in `APP_TZ` (default `Asia/Jakarta`). The **carry-over** of an open quadrant-1 task is the number of local days from the date of `q1_since` to today: how long it has been in Next version. The badge shows nothing below `VERSION_AMBER_DAYS`, amber from `VERSION_AMBER_DAYS` up to `VERSION_STALE_DAYS`, and red at `VERSION_STALE_DAYS` or more (with today's values: nothing at 0–4, amber at 5–6, red at 7+). Nothing runs at midnight; carry-over is computed when read.

`carryOverTone(days)` implements these thresholds. The badge reads `Nd in version` and its label is `In Next version`. `carry_over_days` keeps its name in the task view and in `get_matrix`.

### Rule 13, replaced

13. **Visibility limits** live as constants in one file. Quadrant 1 always shows every open task and shows no warning, however many there are. Quadrants 2–4 show their top 5 (`VISIBLE_PER_QUADRANT = 5`) followed by a "+N more" toggle that shows the rest in place. The toggle state lives only in the browser and is not saved.

The quadrant header loses the "Over N — move some down" text.

### Summary line

`Next version N open · S over a week · oldest open Dd`

- N = the number of open quadrant-1 tasks.
- S = open quadrant-1 tasks with a carry-over of `VERSION_STALE_DAYS` or more.
- D = the largest age among open tasks. The `oldest open` part is left out when nothing is open.

`Summary` becomes `{ versionOpen: number; versionStale: number; oldestOpenDays: number | null }`, and `getSummary` no longer reads the Done-today list. The **Done today** list below the matrix is unchanged.

### Wording

- `app/layout.tsx` metadata description: `A priority matrix whose top-left quadrant is the checklist for the next version.`
- `lib/mcp/server.ts`:
  - the quadrant field: `1 = Next version (the checklist for the next release), 2 = Schedule, 3 = Delegate, 4 = Later. Priority 1 > 2 > 3 > 4.`
  - `get_matrix`: carry_over_days counts the local days a quadrant-1 task has been in Next version.
  - the `triage` prompt description: `Plan the next version: complete tasks whose issues closed, take stale work out, add every urgent issue and the next slice of each repo's version milestone.` Its `repos` argument is unchanged.
- `README.md`: the intro paragraph and the Triage section describe Next version and the new steps; the example uses repos that exist (`fendyjong/ai-automatic-engagement,fendyjong/kolva-gravity`).
- `docs/specs/2026-10-02-gravity-v1.md`: bumped to version 4 with `**Changes since 3:**` naming this spec, and updated to match it: Goal, Quadrants table, rules 5 and 13, summary line, the MCP quadrant wording and the `triage` prompt section.

## Triage prompt

`lib/mcp/triage.md` is rewritten. `triagePrompt` fills three placeholders, every occurrence of each:

| placeholder | filled with |
|---|---|
| `{{repos}}` | `Repos to plan from: <a>, <b>.` or `No repos were given: skip step 5.` |
| `{{budget}}` | `VERSION_BUDGET` |
| `{{stale_days}}` | `VERSION_STALE_DAYS` |

### What the prompt states up front

- Quadrant 1, **Next version**, is the checklist of everything to finish before the next release. The user deploys by hand, at least once a week; Gravity knows nothing about deployments. One batch covers every repo. Quadrant 2 is Schedule, 3 is Delegate, 4 is Later. Priority runs 1 > 2 > 3 > 4, and within a quadrant position 0 is the top.
- Use the gravity MCP tools for every change and `gh` only to read GitHub. Never change an issue, label or milestone.
- An issue is exactly one task. Never add a task without `issue_url` for work on an issue that already has a task.
- **Urgent**: an issue whose title contains `URGENT` (any case), or an issue labelled `bug` that, judging by its title and body, is hurting production. A task without an issue is urgent when its description contains `URGENT`.
- **Points**: `size:S` = 1, `size:M` = 2, `size:L` = 4. An issue with no size label, and a task without an issue, count 2.
- **Points used** is the sum of the points of the open quadrant-1 tasks at that moment, so urgent issues and the user's own tasks count toward it.
- **Budget**: roadmap work (steps 5b and 6) is added only while points used, including the task being added, stays within `{{budget}}`. Urgent issues are added regardless, and nothing is moved out of quadrant 1 to make room.
- **Adding an issue** means `add_task` with the issue title as the description (one line, cut to 200 characters), quadrant 1, and the issue URL as `issue_url`. When it returns `existing: true`: a task open in quadrant 1 needs nothing; a task open in another quadrant is moved up with `move_task` to quadrant 1; a completed or dropped task is left alone and named in the summary.

### Steps, in order

1. **Read** every open task with `get_matrix`.
2. **Check GitHub.** For each open task with an `issue_url`, in any quadrant, run `gh issue view <issue_url> --json state,title,labels`. Complete the task with `complete_task` when the issue is closed. Keep each issue's labels and title for points and urgency.
3. **Stale tasks.** For each quadrant-1 task whose `carry_over_days` is `{{stale_days}}` or more:
   - urgent: it stays; the summary names it as holding up the version;
   - not urgent, with an `issue_url`: move it to quadrant 2 with `move_task`. It is never split;
   - without an `issue_url`: split it into smaller tasks (add each part to quadrant 1 with `add_task`, then drop the original with `drop_task`), or move it to quadrant 2.
4. **Put-off tasks.** A task in quadrant 3 or 4 with a large `age_days`, or `demotions` of 1 or more, moves up one quadrant with `move_task`. This step never moves a task into quadrant 1.
5. **Fill from `repos`.**
   - **5a. Urgent issues, without limit.** For each repo, run `gh issue list --repo <r> --state open --search "URGENT in:title" --limit 100 --json number,title,url,labels` and `gh issue list --repo <r> --state open --label bug --limit 200 --json number,title,url,labels`. Read a bug with `gh issue view <url> --json body` when its title alone does not show whether production is hurt. Add every urgent issue.
   - **5b. Roadmap issues, within the budget.**
      - **Version milestones.** `gh api "repos/<r>/milestones?state=open&per_page=100"`. A version milestone's title starts with `v` and a digit, e.g. `v1.x.x - Modular Monolith`. Order them by the leading version compared part by part, with `x` counting as 0 (`v1.x.x` comes before `v1.1.x`), then by milestone number.
      - **Candidates** are the open issues of the repo's first version milestone: `gh api "repos/<r>/issues?milestone=<number>&state=open&per_page=100"`, which returns labels, body, `sub_issues_summary` and `issue_dependencies_summary`; entries with a `pull_request` field are pull requests and are ignored. When every open issue of a milestone is skipped or already in quadrant 1, the repo's next version milestone supplies candidates.
      - **Skip** an issue that is labelled `status:blocked` or `status:draft`; that is blocked by an open issue not in quadrant 1 (`issue_dependencies_summary.blocked_by` above 0, the blockers from `gh api repos/<r>/issues/<n>/dependencies/blocked_by`, or `depends on #N` in its body with #N open); or whose task is completed or dropped. An issue with open sub-issues (`sub_issues_summary.completed` below `.total`) is never added: its open sub-issues, from `gh api repos/<r>/issues/<n>/sub_issues`, are candidates in its place, in that order.
      - **Order**: an issue before the issues that depend on it, then the lowest issue number. An issue whose task has `demotions` of 1 or more goes after every other candidate in its milestone.
      - **A repo with no version milestone** supplies candidates the LLM picks from `gh issue list --repo <r> --state open --limit 200 --json number,title,url,labels,updatedAt` by labels, size and recency, with the same skips. A repo that has version milestones never takes roadmap issues from any other milestone or from issues without one.
      - **Turns**: take one candidate per repo per turn, in the order `repos` lists them. Add a candidate when it fits the budget. When one does not fit, that repo is done for this run. Stop when every repo is done.
6. **Top up from Schedule.** In order from the top, move open quadrant-2 tasks into quadrant 1 with `move_task` while they fit the budget, skipping any task moved out of quadrant 1 in this run. Stop at the first that does not fit. This step runs even when no repos were given.
7. **Reorder** each quadrant with `reorder_quadrant`, calling `get_matrix` again first. Quadrant 1: urgent tasks first, then dependencies before the tasks that depend on them, then the rest. Other quadrants: most important first.
8. **Summary.** Say briefly:
   - which tasks were completed because their issues closed;
   - what moved out of Next version, and why;
   - what was added, and why (urgent, which milestone, picked, or from Schedule);
   - points used out of `{{budget}}`;
   - urgent tasks at `{{stale_days}}`+ days, holding up the version;
   - open issues whose tasks are completed or dropped in Gravity;
   - issue-linked tasks moved out in this run that had been moved out before (`demotions` was already 1 or more): suggest splitting the issue on GitHub.

## Testing

- **Unit (Vitest)**:
  - `carryOverTone`: nothing at 0 and 4, amber at 5 and 6, red at 7 and 40.
  - `formatSummary`: the new line, with and without the `oldest open` part.
  - `getSummary`: `versionOpen`, and `versionStale` changing between 6 and 7 days in quadrant 1 across a WIB midnight.
  - `triagePrompt`: the budget and stale-day values come from `lib/limits.ts`, no `{{` is left, the repos line for a list, and `No repos were given: skip step 5.` for none.
- **MCP integration (Vitest)**: the `triage` prompt listing and a `prompts/get` call still work, and the quadrant field description says Next version.
- **E2E (Playwright)**: the existing spec, with quadrant 1 found by the name `Next version`, still passes at 375px and 1280px.

## Done when

- `pnpm validate` passes.
- After deploy, `https://gravity.local.zeven.day` shows quadrant 1 as **Next version** with no warning, and the new summary line.
- `/mcp__gravity__triage fendyjong/ai-automatic-engagement` puts both open `URGENT:` issues (#1898 and #1899) in Next version, adds roadmap issues only from `v1.x.x - Modular Monolith` within 10 points, and reports points used. A second run straight after adds no roadmap issue and creates no duplicates.

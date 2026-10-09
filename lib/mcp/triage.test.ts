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

  it("never puts a task moved out in this run straight back, and names issues by their web URL", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain("whose task is completed or dropped; or whose task was moved out of quadrant 1 in this run.");
    expect(text).toContain("the issue's web URL as `issue_url` (`url` from `gh issue list`, `html_url` from `gh api`)");
  });

  it("lists milestone issues and sub-issues oldest first across every page", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain(
      'gh api --paginate "repos/<owner/repo>/issues?milestone=<number>&state=open&per_page=100&sort=created&direction=asc"',
    );
    expect(text).toContain('gh api --paginate "repos/<owner/repo>/issues/<number>/sub_issues?per_page=100"');
  });

  it("names each bug judged urgent in the summary", () => {
    expect(triagePrompt("o/r")).toContain("each `bug` judged urgent, with a one-line reason;");
  });

  it("only ever reads GitHub", () => {
    const text = triagePrompt("o/r");
    expect(text).not.toMatch(/gh (issue|pr|label|api) (edit|close|comment|create|reopen|delete|lock|transfer)\b/);
    expect(text).not.toMatch(/--method|(^|\s)-X\s|(^|\s)-[fF]\s|--field|--raw-field|--input/m);
  });
});

describe("the triage prompt over MCP", () => {
  let client: Client;

  beforeEach(async () => {
    const store = createTaskStore(openDatabase(":memory:"), { now: () => new Date(), timeZone: "Asia/Jakarta" });
    client = await connectTestClient(store);
  });

  afterEach(async () => {
    await client.close();
  });

  it("is listed with one optional argument, repos", async () => {
    const { prompts } = await client.listPrompts();
    const triage = prompts.find((prompt) => prompt.name === "triage");
    expect(triage?.arguments?.map((argument) => argument.name)).toEqual(["repos"]);
    expect(triage?.arguments?.[0]?.required).not.toBe(true);
  });

  it("returns the prompt text as one user message", async () => {
    const result = await client.getPrompt({ name: "triage", arguments: { repos: "o/r" } });
    expect(result.messages).toHaveLength(1);
    const [message] = result.messages;
    expect(message.role).toBe("user");
    expect(message.content).toMatchObject({ type: "text" });
    expect((message.content as { text: string }).text).toContain("Repos to plan from: o/r.");
  });

  it("describes the prompt as planning the next version", async () => {
    const { prompts } = await client.listPrompts();
    const triage = prompts.find((prompt) => prompt.name === "triage");
    expect(triage?.description).toBe(
      "Plan the next version: complete tasks whose issues closed, take stale work out, add every urgent issue and the next slice of each repo's version milestone.",
    );
  });

  it("gives a repos example that names repos that exist", async () => {
    const { prompts } = await client.listPrompts();
    const triage = prompts.find((prompt) => prompt.name === "triage");
    expect(triage?.arguments?.[0]?.description).toBe(
      "Comma-separated owner/repo list, e.g. fendyjong/ai-automatic-engagement,fendyjong/kolva-gravity",
    );
  });
});

import type { Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { createTaskStore } from "@/lib/tasks";
import { connectTestClient } from "./test-client";
import { triagePrompt } from "./triage";

describe("triagePrompt", () => {
  it("names the repos and caps the import at 10 issues", () => {
    const text = triagePrompt(" fendyjong/kolva-gravity , fendyjong/kolva-sim ");
    expect(text).toContain("Repos to shortlist issues from: fendyjong/kolva-gravity, fendyjong/kolva-sim.");
    expect(text).toContain("at most 10");
    expect(text).not.toContain("{{repos}}");
  });

  it("skips the GitHub step when no repos are given", () => {
    expect(triagePrompt()).toContain("No repos were given: skip step 5.");
    expect(triagePrompt("  ")).toContain("No repos were given: skip step 5.");
  });

  it("keeps each issue to one task and never splits an issue-linked task", () => {
    const text = triagePrompt("o/r");
    expect(text).toContain(
      "An issue is exactly one task. Never add a task without `issue_url` for work on an issue that already has a task.",
    );
    expect(text).toContain("A task with an `issue_url` is never split: move it down with `move_task`.");
  });

  it("covers the spec's eight steps in order", () => {
    const text = triagePrompt("o/r");
    const markers = [
      "get_matrix",
      "carry_over_days",
      "demotions",
      "5 tasks or fewer",
      "gh issue list",
      "gh issue view",
      "reorder_quadrant",
      "summary",
    ];
    const positions = markers.map((marker) => text.indexOf(marker));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
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
    expect((message.content as { text: string }).text).toContain("Repos to shortlist issues from: o/r.");
  });
});

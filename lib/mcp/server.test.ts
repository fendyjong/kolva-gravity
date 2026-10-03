import type { Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { createTaskStore } from "@/lib/tasks";
import { connectTestClient } from "./test-client";

const NOW = new Date("2026-10-03T02:00:00.000Z");

let client: Client;

beforeEach(async () => {
  const store = createTaskStore(openDatabase(":memory:"), { now: () => NOW, timeZone: "Asia/Jakarta" });
  client = await connectTestClient(store);
});

afterEach(async () => {
  await client.close();
});

async function call(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const [first] = result.content as { type: string; text: string }[];
  return { isError: result.isError === true, text: first.text };
}

async function ok(name: string, args: Record<string, unknown>) {
  const result = await call(name, args);
  expect(result.isError, result.text).toBe(false);
  return JSON.parse(result.text);
}

describe("gravity MCP tools", () => {
  it("lists exactly the eight tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "add_task",
      "complete_task",
      "drop_task",
      "get_matrix",
      "move_task",
      "reopen_task",
      "reorder_quadrant",
      "update_task",
    ]);
  });

  it("add_task returns the task, and the existing task for an issue already added", async () => {
    const url = "https://github.com/o/r/issues/1";
    const first = await ok("add_task", { description: "Fix login", quadrant: 2, issue_url: url });
    expect(first).toMatchObject({ description: "Fix login", quadrant: 2, position: 0, issue_url: url, existing: false });
    const again = await ok("add_task", { description: "Fix login, again", quadrant: 1, issue_url: url });
    expect(again).toMatchObject({ id: first.id, description: "Fix login", quadrant: 2, existing: true });
  });

  it("get_matrix returns every open task with the spec's fields and no visibility limit", async () => {
    for (let i = 0; i < 7; i++) await ok("add_task", { description: `task ${i}`, quadrant: 2 });
    await ok("add_task", { description: "today", quadrant: 1 });
    const all = await ok("get_matrix", {});
    expect(all).toHaveLength(8);
    expect(Object.keys(all[0]).sort()).toEqual([
      "age_days",
      "carry_over_days",
      "created_at",
      "demotions",
      "description",
      "id",
      "issue_url",
      "position",
      "quadrant",
    ]);
    expect(all[0]).toMatchObject({ quadrant: 1, description: "today" });
    expect(await ok("get_matrix", { quadrant: 2 })).toHaveLength(7);
  });

  it("update_task, move_task and reorder_quadrant change tasks", async () => {
    const a = await ok("add_task", { description: "a", quadrant: 1 });
    const b = await ok("add_task", { description: "b", quadrant: 2 });
    expect(await ok("update_task", { id: a.id, description: "a, reworded" })).toMatchObject({
      description: "a, reworded",
    });
    expect(await ok("move_task", { id: a.id, quadrant: 2 })).toMatchObject({ quadrant: 2, position: 1, demotions: 1 });
    expect(await ok("move_task", { id: a.id, quadrant: 2, position: 0 })).toMatchObject({ position: 0 });
    const reordered = await ok("reorder_quadrant", { quadrant: 2, ids: [b.id, a.id] });
    expect(reordered.map((task: { id: number }) => task.id)).toEqual([b.id, a.id]);
  });

  it("complete_task, reopen_task and drop_task close and reopen tasks", async () => {
    const a = await ok("add_task", { description: "a", quadrant: 1 });
    expect((await ok("complete_task", { id: a.id })).completed_at).toBe(NOW.toISOString());
    expect((await ok("reopen_task", { id: a.id })).completed_at).toBeNull();
    expect((await ok("drop_task", { id: a.id })).dropped_at).toBe(NOW.toISOString());
    expect(await ok("get_matrix", {})).toEqual([]);
  });
});

describe("gravity MCP errors", () => {
  it("returns broken rules and unknown ids as isError results that say what is needed", async () => {
    const a = await ok("add_task", { description: "a", quadrant: 1 });
    const b = await ok("add_task", { description: "b", quadrant: 4 });
    await ok("complete_task", { id: a.id });
    expect(await call("move_task", { id: a.id, quadrant: 2 })).toEqual({
      isError: true,
      text: `task ${a.id} is completed; reopen it first`,
    });
    expect(await call("complete_task", { id: 999 })).toEqual({ isError: true, text: "task 999 not found" });
    expect(await call("move_task", { id: b.id, quadrant: 5 })).toEqual({
      isError: true,
      text: "quadrant must be 1, 2, 3 or 4",
    });
    expect(await call("reorder_quadrant", { quadrant: 4, ids: [] })).toEqual({
      isError: true,
      text: `ids must list each open task in quadrant 4 exactly once: ${b.id}`,
    });
  });

  it("returns invalid input as an isError result", async () => {
    const result = await call("add_task", { description: 42, quadrant: "one" });
    expect(result.isError).toBe(true);
  });
});

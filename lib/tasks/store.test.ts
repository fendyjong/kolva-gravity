import { beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { createTaskStore, type TaskStore } from "./store";
import { TaskError } from "./types";

// 09:00 WIB on 3 Oct 2026.
const START = "2026-10-03T02:00:00.000Z";

let now: Date;
let store: TaskStore;

beforeEach(() => {
  now = new Date(START);
  store = createTaskStore(openDatabase(":memory:"), { now: () => now, timeZone: "Asia/Jakarta" });
});

function at(iso: string) {
  now = new Date(iso);
}

function add(description: string, quadrant = 2, extra: { issue_url?: string; position?: number } = {}) {
  return store.add({ description, quadrant, ...extra }).task;
}

function order(quadrant: number): number[] {
  return store.getMatrix(quadrant).map((task) => task.id);
}

function positions(quadrant: number): number[] {
  return store.getMatrix(quadrant).map((task) => task.position);
}

function rejects(change: () => unknown, message: string | RegExp) {
  expect(change).toThrowError(TaskError);
  expect(change).toThrowError(message);
}

describe("rule 1: positions stay contiguous", () => {
  it("renumbers each quadrant 0..n-1 after every kind of change", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c");
    const d = add("d");
    store.complete(b.id);
    expect(positions(2)).toEqual([0, 1, 2]);
    store.drop(a.id);
    expect(positions(2)).toEqual([0, 1]);
    store.move(c.id, 3);
    expect(positions(2)).toEqual([0]);
    expect(positions(3)).toEqual([0]);
    store.reopen(b.id);
    expect(order(2)).toEqual([d.id, b.id]);
    expect(positions(2)).toEqual([0, 1]);
  });
});

describe("rule 2: add", () => {
  it("adds to the bottom of the quadrant by default", () => {
    const a = add("a");
    const b = add("b");
    expect(order(2)).toEqual([a.id, b.id]);
    expect(b.position).toBe(1);
  });

  it("inserts at a given position and shifts the tasks below down", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c", 2, { position: 0 });
    expect(order(2)).toEqual([c.id, a.id, b.id]);
    expect(positions(2)).toEqual([0, 1, 2]);
  });

  it("rejects a position past the bottom", () => {
    add("a");
    rejects(() => add("b", 2, { position: 2 }), "position must be a whole number from 0 to 1");
  });

  it("trims the description and rejects empty, over-long and multi-line ones", () => {
    expect(add("  tidy desk  ").description).toBe("tidy desk");
    expect(add("é".repeat(200)).description).toHaveLength(200);
    const message = "description must be 1–200 characters on a single line";
    rejects(() => add("   "), message);
    rejects(() => add("x".repeat(201)), message);
    rejects(() => add("line one\nline two"), message);
  });

  it("rejects a quadrant outside 1–4 and a malformed issue_url", () => {
    rejects(() => add("a", 0), "quadrant must be 1, 2, 3 or 4");
    rejects(() => add("a", 5), "quadrant must be 1, 2, 3 or 4");
    rejects(
      () => add("a", 2, { issue_url: "https://github.com/o/r/pull/1" }),
      "issue_url must look like https://github.com/<owner>/<repo>/issues/<number>",
    );
  });

  it("sets created_at once from the clock and starts demotions at 0", () => {
    const a = add("a");
    expect(a.created_at).toBe(START);
    expect(a.demotions).toBe(0);
    at("2026-10-05T02:00:00.000Z");
    expect(store.update(a.id, "renamed").created_at).toBe(START);
  });
});

describe("rule 3: duplicate issues", () => {
  it("returns the existing task, in any state, with existing: true and changes nothing", () => {
    const url = "https://github.com/o/r/issues/7";
    const first = store.add({ description: "Fix it", quadrant: 3, issue_url: url });
    expect(first.existing).toBe(false);
    store.complete(first.task.id);
    const again = store.add({ description: "Another title", quadrant: 1, issue_url: url });
    expect(again.existing).toBe(true);
    expect(again.task.id).toBe(first.task.id);
    expect(again.task.description).toBe("Fix it");
    expect(again.task.quadrant).toBe(3);
    expect(again.task.completed_at).not.toBeNull();
    expect(store.getMatrix()).toEqual([]);
  });
});

describe("rule 4: quadrant 1 clock", () => {
  it("sets q1_since on entering quadrant 1 by add or move and clears it on leaving", () => {
    const a = add("a", 1);
    expect(a.q1_since).toBe(START);
    const b = add("b", 2);
    expect(b.q1_since).toBeNull();
    at("2026-10-04T02:00:00.000Z");
    expect(store.move(b.id, 1).q1_since).toBe("2026-10-04T02:00:00.000Z");
    expect(store.move(a.id, 2).q1_since).toBeNull();
  });

  it("is not changed by reordering, completing, dropping or reopening", () => {
    const a = add("a", 1);
    add("b", 1);
    at("2026-10-05T02:00:00.000Z");
    expect(store.move(a.id, 1, 1).q1_since).toBe(START);
    expect(store.complete(a.id).q1_since).toBe(START);
    expect(store.reopen(a.id).q1_since).toBe(START);
    expect(store.drop(a.id).q1_since).toBe(START);
    expect(store.reopen(a.id).q1_since).toBe(START);
  });
});

describe("rule 5: carry-over", () => {
  it("counts local days since q1_since, across a WIB midnight", () => {
    at("2026-10-02T16:59:00.000Z"); // 23:59 WIB, 2 Oct
    const a = add("a", 1);
    expect(store.get(a.id).carry_over_days).toBe(0);
    at("2026-10-02T17:01:00.000Z"); // 00:01 WIB, 3 Oct
    expect(store.get(a.id).carry_over_days).toBe(1);
    at("2026-10-05T03:00:00.000Z");
    expect(store.get(a.id).carry_over_days).toBe(3);
  });

  it("is 0 outside quadrant 1 and for closed tasks", () => {
    const a = add("a", 2);
    const b = add("b", 1);
    at("2026-10-08T02:00:00.000Z");
    expect(store.get(a.id).carry_over_days).toBe(0);
    expect(store.complete(b.id).carry_over_days).toBe(0);
  });

  it("follows the configured time zone", () => {
    const utc = createTaskStore(openDatabase(":memory:"), { now: () => now, timeZone: "UTC" });
    at("2026-10-02T16:59:00.000Z");
    const a = utc.add({ description: "a", quadrant: 1 }).task;
    at("2026-10-02T17:01:00.000Z");
    expect(utc.get(a.id).carry_over_days).toBe(0);
  });
});

describe("rule 6: age", () => {
  it("counts local days since created_at", () => {
    at("2026-10-02T16:59:00.000Z");
    const a = add("a");
    at("2026-10-02T17:01:00.000Z");
    expect(store.get(a.id).age_days).toBe(1);
    at("2026-10-14T02:00:00.000Z");
    expect(store.get(a.id).age_days).toBe(12);
  });
});

describe("rule 7: demotions", () => {
  it("adds 1 for every move to a higher-numbered quadrant and never goes down", () => {
    const a = add("a", 1);
    expect(store.move(a.id, 3).demotions).toBe(1);
    expect(store.move(a.id, 1).demotions).toBe(1);
    expect(store.move(a.id, 2).demotions).toBe(2);
    add("b", 2);
    expect(store.move(a.id, 2, 1).demotions).toBe(2);
  });
});

describe("rule 8: move", () => {
  it("puts a task moved to another quadrant at the bottom unless a position is given", () => {
    const a = add("a", 3);
    const b = add("b", 3);
    const c = add("c", 2);
    const d = add("d", 2);
    store.move(c.id, 3);
    expect(order(3)).toEqual([a.id, b.id, c.id]);
    store.move(d.id, 3, 0);
    expect(order(3)).toEqual([d.id, a.id, b.id, c.id]);
    expect(order(2)).toEqual([]);
  });

  it("reorders within the same quadrant, which requires a position", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c");
    store.move(a.id, 2, 2);
    expect(order(2)).toEqual([b.id, c.id, a.id]);
    rejects(() => store.move(a.id, 2), `task ${a.id} is already in quadrant 2; give a position to reorder it`);
    rejects(() => store.move(a.id, 2, 3), "position must be a whole number from 0 to 2");
  });

  it("rejects moving up from quadrant 1 or down from quadrant 4", () => {
    const a = add("a", 1);
    const d = add("d", 4);
    rejects(() => store.move(a.id, 0), "quadrant must be 1, 2, 3 or 4");
    rejects(() => store.move(d.id, 5), "quadrant must be 1, 2, 3 or 4");
  });

  it("rejects an unknown id", () => {
    rejects(() => store.move(999, 2), "task 999 not found");
  });
});

describe("reorderQuadrant", () => {
  it("sets the order of a whole quadrant", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c");
    const result = store.reorderQuadrant(2, [c.id, a.id, b.id]);
    expect(result.map((task) => task.id)).toEqual([c.id, a.id, b.id]);
    expect(order(2)).toEqual([c.id, a.id, b.id]);
    expect(positions(2)).toEqual([0, 1, 2]);
  });

  it("rejects ids that are not exactly the quadrant's open tasks", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c", 3);
    const message = `ids must list each open task in quadrant 2 exactly once: ${a.id}, ${b.id}`;
    rejects(() => store.reorderQuadrant(2, [a.id]), message);
    rejects(() => store.reorderQuadrant(2, [a.id, a.id]), message);
    rejects(() => store.reorderQuadrant(2, [a.id, b.id, c.id]), `task ${c.id} is in quadrant 3, not 2`);
    rejects(() => store.reorderQuadrant(4, [a.id]), `task ${a.id} is in quadrant 2, not 4`);
    expect(order(2)).toEqual([a.id, b.id]);
  });
});

describe("update", () => {
  it("changes only the description, trimmed and validated", () => {
    const a = add("a");
    expect(store.update(a.id, "  better words ").description).toBe("better words");
    rejects(() => store.update(a.id, ""), "description must be 1–200 characters on a single line");
  });
});

describe("rule 9: complete and drop", () => {
  it("set completed_at or dropped_at and take the task out of its quadrant's ordering", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c");
    at("2026-10-03T05:00:00.000Z");
    const done = store.complete(a.id);
    expect(done.completed_at).toBe("2026-10-03T05:00:00.000Z");
    expect(done.dropped_at).toBeNull();
    const dropped = store.drop(b.id);
    expect(dropped.dropped_at).toBe("2026-10-03T05:00:00.000Z");
    expect(dropped.completed_at).toBeNull();
    expect(order(2)).toEqual([c.id]);
    expect(positions(2)).toEqual([0]);
  });
});

describe("rule 10: reopen", () => {
  it("clears completed_at or dropped_at and puts the task at the bottom of its quadrant", () => {
    const a = add("a");
    const b = add("b");
    const c = add("c");
    store.complete(a.id);
    store.drop(b.id);
    expect(store.reopen(a.id).completed_at).toBeNull();
    expect(order(2)).toEqual([c.id, a.id]);
    expect(store.reopen(b.id).dropped_at).toBeNull();
    expect(order(2)).toEqual([c.id, a.id, b.id]);
  });

  it("keeps q1_since, so completing and reopening cannot reset carry-over", () => {
    const a = add("a", 1);
    at("2026-10-05T02:00:00.000Z");
    store.complete(a.id);
    expect(store.reopen(a.id).carry_over_days).toBe(2);
  });

  it("rejects reopening an open task", () => {
    const a = add("a");
    rejects(() => store.reopen(a.id), `task ${a.id} is already open`);
  });
});

describe("rule 11: no delete", () => {
  it("offers no way to delete a task", () => {
    expect(Object.keys(store).sort()).toEqual([
      "add",
      "complete",
      "drop",
      "get",
      "getDoneToday",
      "getMatrix",
      "getSummary",
      "move",
      "reopen",
      "reorderQuadrant",
      "update",
    ]);
  });
});

describe("rule 12: closed tasks can only be reopened", () => {
  it.each(["completed", "dropped"] as const)(
    "rejects editing, moving, reordering, completing and dropping a %s task",
    (state) => {
      const a = add("a");
      const b = add("b");
      if (state === "completed") store.complete(a.id);
      else store.drop(a.id);
      const message = `task ${a.id} is ${state}; reopen it first`;
      rejects(() => store.update(a.id, "x"), message);
      rejects(() => store.move(a.id, 3), message);
      rejects(() => store.move(a.id, 2, 0), message);
      rejects(() => store.reorderQuadrant(2, [a.id, b.id]), message);
      rejects(() => store.complete(a.id), message);
      rejects(() => store.drop(a.id), message);
      expect(store.reopen(a.id).id).toBe(a.id);
    },
  );
});

describe("done today and the summary", () => {
  it("lists tasks completed on today's local date, newest first, never dropped ones", () => {
    at("2026-10-02T16:00:00.000Z"); // 23:00 WIB, 2 Oct
    const yesterday = add("yesterday", 1);
    store.complete(yesterday.id);
    at("2026-10-02T18:00:00.000Z"); // 01:00 WIB, 3 Oct
    const a = add("a", 1);
    const b = add("b", 2);
    const c = add("c", 1);
    store.complete(a.id);
    at("2026-10-02T19:00:00.000Z");
    store.complete(b.id);
    store.drop(c.id);
    expect(store.getDoneToday().map((task) => task.id)).toEqual([b.id, a.id]);
  });

  it("counts X/Y done, carried over, and the oldest open age", () => {
    at("2026-10-01T02:00:00.000Z");
    add("old", 1);
    at(START);
    add("fresh", 1);
    const done = add("done", 1);
    add("elsewhere", 3);
    store.complete(done.id);
    expect(store.getSummary()).toEqual({
      doneToday: 1,
      totalToday: 3,
      carriedOver: 1,
      oldestOpenDays: 2,
    });
  });

  it("leaves oldestOpenDays null when nothing is open", () => {
    expect(store.getSummary()).toEqual({
      doneToday: 0,
      totalToday: 0,
      carriedOver: 0,
      oldestOpenDays: null,
    });
  });
});

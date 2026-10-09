import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import { VERSION_STALE_DAYS } from "@/lib/limits";
import { localDate, localDaysBetween } from "./dates";
import {
  TaskError,
  type AddResult,
  type AddTaskInput,
  type DoneTaskView,
  type Quadrant,
  type Summary,
  type Task,
  type TaskView,
} from "./types";

const ISSUE_URL = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;
const MAX_DESCRIPTION = 200;
const OPEN = "completed_at IS NULL AND dropped_at IS NULL";

export interface TaskStoreOptions {
  now: () => Date;
  timeZone: string;
}

export interface TaskStore {
  add(input: AddTaskInput): AddResult;
  update(id: number, description: string): TaskView;
  move(id: number, quadrant: number, position?: number | null): TaskView;
  reorderQuadrant(quadrant: number, ids: number[]): TaskView[];
  complete(id: number): TaskView;
  reopen(id: number): TaskView;
  drop(id: number): TaskView;
  get(id: number): TaskView;
  getMatrix(quadrant?: number): TaskView[];
  getDoneToday(): DoneTaskView[];
  getSummary(): Summary;
}

type Row = Record<string, SQLOutputValue>;

/** Copies a row into a plain object (node:sqlite rows have a null prototype). */
function toTask(row: Row): Task {
  return {
    id: Number(row.id),
    description: String(row.description),
    quadrant: Number(row.quadrant) as Quadrant,
    position: Number(row.position),
    issue_url: row.issue_url === null ? null : String(row.issue_url),
    created_at: String(row.created_at),
    completed_at: row.completed_at === null ? null : String(row.completed_at),
    dropped_at: row.dropped_at === null ? null : String(row.dropped_at),
    q1_since: row.q1_since === null ? null : String(row.q1_since),
    demotions: Number(row.demotions),
  };
}

function cleanDescription(raw: string): string {
  const description = String(raw).trim();
  const length = [...description].length;
  if (length < 1 || length > MAX_DESCRIPTION || /[\r\n]/.test(description)) {
    throw new TaskError("invalid", `description must be 1–${MAX_DESCRIPTION} characters on a single line`);
  }
  return description;
}

function checkQuadrant(quadrant: number): Quadrant {
  if (quadrant !== 1 && quadrant !== 2 && quadrant !== 3 && quadrant !== 4) {
    throw new TaskError("invalid", "quadrant must be 1, 2, 3 or 4");
  }
  return quadrant;
}

function checkPosition(position: number, max: number): number {
  if (!Number.isInteger(position) || position < 0 || position > max) {
    throw new TaskError("invalid", `position must be a whole number from 0 to ${max}`);
  }
  return position;
}

/** The task module: the only code that reads or writes tasks. */
export function createTaskStore(db: DatabaseSync, { now, timeZone }: TaskStoreOptions): TaskStore {
  function transaction<T>(change: () => T): T {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = change();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function view(task: Task, at: Date): TaskView {
    const open = task.completed_at === null && task.dropped_at === null;
    return {
      ...task,
      age_days: localDaysBetween(task.created_at, at, timeZone),
      carry_over_days:
        open && task.quadrant === 1 && task.q1_since !== null
          ? localDaysBetween(task.q1_since, at, timeZone)
          : 0,
    };
  }

  function row(id: number): Task {
    const found = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    if (!found) throw new TaskError("not_found", `task ${id} not found`);
    return toTask(found);
  }

  function openRow(id: number): Task {
    const task = row(id);
    if (task.completed_at !== null) {
      throw new TaskError("closed", `task ${id} is completed; reopen it first`);
    }
    if (task.dropped_at !== null) {
      throw new TaskError("closed", `task ${id} is dropped; reopen it first`);
    }
    return task;
  }

  function openIds(quadrant: Quadrant): number[] {
    return db
      .prepare(`SELECT id FROM tasks WHERE quadrant = ? AND ${OPEN} ORDER BY position, id`)
      .all(quadrant)
      .map((found) => Number(found.id));
  }

  /** Rule 1: writes positions 0..n-1 in the given order. */
  function writePositions(ids: number[]): void {
    const update = db.prepare("UPDATE tasks SET position = ? WHERE id = ?");
    ids.forEach((id, position) => update.run(position, id));
  }

  function close(id: number, column: "completed_at" | "dropped_at"): TaskView {
    return transaction(() => {
      const task = openRow(id);
      const at = now();
      db.prepare(`UPDATE tasks SET ${column} = ? WHERE id = ?`).run(at.toISOString(), id);
      writePositions(openIds(task.quadrant));
      return view(row(id), at);
    });
  }

  function getMatrix(quadrant?: number): TaskView[] {
    const at = now();
    const rows =
      quadrant === undefined
        ? db.prepare(`SELECT * FROM tasks WHERE ${OPEN} ORDER BY quadrant, position`).all()
        : db
            .prepare(`SELECT * FROM tasks WHERE ${OPEN} AND quadrant = ? ORDER BY position`)
            .all(checkQuadrant(quadrant));
    return rows.map((found) => view(toTask(found), at));
  }

  function getDoneToday(): DoneTaskView[] {
    const at = now();
    const today = localDate(at, timeZone);
    // A local day is at most 26 hours long, so older rows cannot be "today".
    const since = new Date(at.getTime() - 26 * 60 * 60 * 1000).toISOString();
    return db
      .prepare("SELECT * FROM tasks WHERE completed_at >= ? ORDER BY completed_at DESC, id DESC")
      .all(since)
      .map(toTask)
      .filter((task) => localDate(new Date(String(task.completed_at)), timeZone) === today)
      .map((task) => view(task, at) as DoneTaskView);
  }

  return {
    add(input) {
      const description = cleanDescription(input.description);
      const quadrant = checkQuadrant(input.quadrant);
      const issueUrl = input.issue_url ?? null;
      if (issueUrl !== null && !ISSUE_URL.test(issueUrl)) {
        throw new TaskError(
          "invalid",
          "issue_url must look like https://github.com/<owner>/<repo>/issues/<number>",
        );
      }
      return transaction(() => {
        const at = now();
        if (issueUrl !== null) {
          const existing = db.prepare("SELECT * FROM tasks WHERE issue_url = ?").get(issueUrl);
          if (existing) return { task: view(toTask(existing), at), existing: true };
        }
        const ids = openIds(quadrant);
        const position =
          input.position === undefined || input.position === null
            ? ids.length
            : checkPosition(input.position, ids.length);
        const stamp = at.toISOString();
        const { lastInsertRowid } = db
          .prepare(
            "INSERT INTO tasks (description, quadrant, position, issue_url, created_at, q1_since) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .run(description, quadrant, ids.length, issueUrl, stamp, quadrant === 1 ? stamp : null);
        const id = Number(lastInsertRowid);
        ids.splice(position, 0, id);
        writePositions(ids);
        return { task: view(row(id), at), existing: false };
      });
    },

    update(id, rawDescription) {
      const description = cleanDescription(rawDescription);
      return transaction(() => {
        openRow(id);
        db.prepare("UPDATE tasks SET description = ? WHERE id = ?").run(description, id);
        return view(row(id), now());
      });
    },

    move(id, rawQuadrant, position) {
      const target = checkQuadrant(rawQuadrant);
      return transaction(() => {
        const task = openRow(id);
        const at = now();
        if (target === task.quadrant) {
          if (position === undefined || position === null) {
            throw new TaskError(
              "invalid",
              `task ${id} is already in quadrant ${target}; give a position to reorder it`,
            );
          }
          const ids = openIds(target).filter((other) => other !== id);
          ids.splice(checkPosition(position, ids.length), 0, id);
          writePositions(ids);
          return view(row(id), at);
        }
        const targetIds = openIds(target);
        const insertAt =
          position === undefined || position === null
            ? targetIds.length
            : checkPosition(position, targetIds.length);
        const demotions = task.demotions + (target > task.quadrant ? 1 : 0);
        const q1Since = target === 1 ? at.toISOString() : null;
        db.prepare("UPDATE tasks SET quadrant = ?, q1_since = ?, demotions = ? WHERE id = ?").run(
          target,
          q1Since,
          demotions,
          id,
        );
        writePositions(openIds(task.quadrant));
        targetIds.splice(insertAt, 0, id);
        writePositions(targetIds);
        return view(row(id), at);
      });
    },

    reorderQuadrant(rawQuadrant, ids) {
      const quadrant = checkQuadrant(rawQuadrant);
      return transaction(() => {
        const current = openIds(quadrant);
        for (const id of ids) {
          if (!current.includes(id)) {
            const task = openRow(id);
            throw new TaskError("invalid", `task ${id} is in quadrant ${task.quadrant}, not ${quadrant}`);
          }
        }
        if (ids.length !== current.length || new Set(ids).size !== ids.length) {
          throw new TaskError(
            "invalid",
            `ids must list each open task in quadrant ${quadrant} exactly once: ${current.join(", ") || "none"}`,
          );
        }
        writePositions(ids);
        const at = now();
        return ids.map((id) => view(row(id), at));
      });
    },

    complete(id) {
      return close(id, "completed_at");
    },

    drop(id) {
      return close(id, "dropped_at");
    },

    reopen(id) {
      return transaction(() => {
        const task = row(id);
        if (task.completed_at === null && task.dropped_at === null) {
          throw new TaskError("invalid", `task ${id} is already open`);
        }
        const bottom = openIds(task.quadrant).length;
        db.prepare(
          "UPDATE tasks SET completed_at = NULL, dropped_at = NULL, position = ? WHERE id = ?",
        ).run(bottom, id);
        return view(row(id), now());
      });
    },

    get(id) {
      return view(row(id), now());
    },

    getMatrix,
    getDoneToday,

    getSummary() {
      const open = getMatrix();
      const version = open.filter((task) => task.quadrant === 1);
      return {
        versionOpen: version.length,
        versionStale: version.filter((task) => task.carry_over_days >= VERSION_STALE_DAYS).length,
        oldestOpenDays: open.length === 0 ? null : Math.max(...open.map((task) => task.age_days)),
      };
    },
  };
}

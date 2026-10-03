import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { closeDatabase, getDatabase, openDatabase } from "./index";
import { MIGRATIONS, migrate } from "./migrations";

const COLUMNS = [
  "id",
  "description",
  "quadrant",
  "position",
  "issue_url",
  "created_at",
  "completed_at",
  "dropped_at",
  "q1_since",
  "demotions",
];

function userVersion(db: ReturnType<typeof openDatabase>): number {
  return Number(db.prepare("PRAGMA user_version").get()?.user_version);
}

describe("openDatabase", () => {
  it("creates exactly one table, tasks, with the spec's columns", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row.name);
    expect(tables).toEqual(["tasks"]);
    const columns = db.prepare("PRAGMA table_info(tasks)").all().map((row) => row.name);
    expect(columns).toEqual(COLUMNS);
  });

  it("records the schema version and migrating again changes nothing", () => {
    const db = openDatabase(":memory:");
    expect(userVersion(db)).toBe(MIGRATIONS.length);
    migrate(db);
    expect(userVersion(db)).toBe(MIGRATIONS.length);
  });

  it("creates the parent directory and uses WAL for a database file", () => {
    const dir = mkdtempSync(join(tmpdir(), "gravity-db-"));
    try {
      const db = openDatabase(join(dir, "nested", "gravity.db"));
      expect(db.prepare("PRAGMA journal_mode").get()?.journal_mode).toBe("wal");
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a task that is both completed and dropped, and a duplicate issue_url", () => {
    const db = openDatabase(":memory:");
    const insert = db.prepare(
      "INSERT INTO tasks (description, quadrant, position, issue_url, created_at, completed_at, dropped_at) VALUES (?, 2, 0, ?, ?, ?, ?)",
    );
    const t = "2026-10-03T02:00:00.000Z";
    expect(() => insert.run("both", null, t, t, t)).toThrow(/CHECK constraint failed/);
    const url = "https://github.com/o/r/issues/1";
    insert.run("first", url, t, null, null);
    expect(() => insert.run("second", url, t, null, null)).toThrow(/UNIQUE constraint failed/);
  });
});

describe("closeDatabase", () => {
  afterEach(() => {
    closeDatabase();
    vi.unstubAllEnvs();
  });

  it("folds the write-ahead log into the main file and forgets the connection", () => {
    const dir = mkdtempSync(join(tmpdir(), "gravity-close-"));
    const path = join(dir, "gravity.db");
    vi.stubEnv("DATABASE_PATH", path);
    try {
      const db = getDatabase();
      db.prepare(
        "INSERT INTO tasks (description, quadrant, position, created_at) VALUES ('kept', 2, 0, '2026-10-03T02:00:00.000Z')",
      ).run();
      expect(existsSync(`${path}-wal`)).toBe(true);

      closeDatabase();
      expect(existsSync(`${path}-wal`)).toBe(false);
      // The main file alone now holds the schema and the row.
      const copy = new DatabaseSync(path);
      expect(copy.prepare("SELECT description FROM tasks").all().map((row) => row.description)).toEqual(["kept"]);
      copy.close();
      // A later getDatabase() opens a fresh connection; closing twice is harmless.
      expect(getDatabase() === db).toBe(false);
      closeDatabase();
      closeDatabase();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

import type { DatabaseSync } from "node:sqlite";

/**
 * Numbered schema steps: step N (1-based) takes `PRAGMA user_version` from N-1 to N.
 * Append only — never edit a step that has shipped.
 */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE tasks (
     id           INTEGER PRIMARY KEY,
     description  TEXT    NOT NULL CHECK (length(description) BETWEEN 1 AND 200),
     quadrant     INTEGER NOT NULL CHECK (quadrant BETWEEN 1 AND 4),
     position     INTEGER NOT NULL,
     issue_url    TEXT    UNIQUE,
     created_at   TEXT    NOT NULL,
     completed_at TEXT,
     dropped_at   TEXT,
     q1_since     TEXT,
     demotions    INTEGER NOT NULL DEFAULT 0,
     CHECK (completed_at IS NULL OR dropped_at IS NULL)
   );
   CREATE INDEX tasks_open_by_position ON tasks (quadrant, position)
     WHERE completed_at IS NULL AND dropped_at IS NULL;`,
];

/** Brings the database up to the latest step, all in one transaction. */
export function migrate(db: DatabaseSync): void {
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = Number(db.prepare("PRAGMA user_version").get()?.user_version ?? 0);
    for (let step = current; step < MIGRATIONS.length; step++) {
      db.exec(MIGRATIONS[step]);
    }
    if (current < MIGRATIONS.length) {
      db.exec(`PRAGMA user_version = ${MIGRATIONS.length}`);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

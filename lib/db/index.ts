import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrations";

/** Opens (creating if needed) the SQLite database at `path`, in WAL mode, migrated to the latest schema. */
export function openDatabase(path: string): DatabaseSync {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  migrate(db);
  return db;
}

// Cached on globalThis so dev-server hot reloads reuse one connection.
const cache = globalThis as typeof globalThis & { gravityDatabase?: DatabaseSync };

/** The app's database at DATABASE_PATH (default data/gravity.db), opened once per process. */
export function getDatabase(): DatabaseSync {
  cache.gravityDatabase ??= openDatabase(process.env.DATABASE_PATH || "data/gravity.db");
  return cache.gravityDatabase;
}

/** Closes the process-wide connection, if open: the last close folds the write-ahead log into the main file. */
export function closeDatabase(): void {
  cache.gravityDatabase?.close();
  delete cache.gravityDatabase;
}

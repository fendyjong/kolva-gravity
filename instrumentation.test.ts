import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MIGRATIONS } from "@/lib/db/migrations";
import { register } from "./instrumentation";

type DatabaseCache = { gravityDatabase?: DatabaseSync };

afterEach(() => {
  // getDatabase() caches the connection on globalThis; release it between tests.
  const cache = globalThis as DatabaseCache;
  cache.gravityDatabase?.close();
  delete cache.gravityDatabase;
  vi.unstubAllEnvs();
});

describe("register", () => {
  it("opens and migrates the database at DATABASE_PATH when the Node.js server starts", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gravity-start-"));
    const path = join(dir, "gravity.db");
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("DATABASE_PATH", path);
    try {
      await register();
      const db = new DatabaseSync(path);
      expect(Number(db.prepare("PRAGMA user_version").get()?.user_version)).toBe(MIGRATIONS.length);
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does nothing outside the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    await register();
    expect((globalThis as DatabaseCache).gravityDatabase).toBeUndefined();
  });
});

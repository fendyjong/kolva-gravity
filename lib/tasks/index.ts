import { getDatabase } from "@/lib/db";
import { createTaskStore, type TaskStore } from "./store";

export { createTaskStore } from "./store";
export type { TaskStore, TaskStoreOptions } from "./store";
export * from "./types";

/** The timezone for local dates (spec rule 5). */
export function appTimeZone(): string {
  return process.env.APP_TZ || "Asia/Jakarta";
}

const cache = globalThis as typeof globalThis & { gravityTaskStore?: TaskStore };

/** The app's task store: the shared database, the real clock, and APP_TZ. */
export function getTaskStore(): TaskStore {
  cache.gravityTaskStore ??= createTaskStore(getDatabase(), {
    now: () => new Date(),
    timeZone: appTimeZone(),
  });
  return cache.gravityTaskStore;
}

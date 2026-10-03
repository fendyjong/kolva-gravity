/** Runs once when a Next.js server starts: opening the database applies any pending migrations. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { closeDatabase, getDatabase } = await import("@/lib/db");
    getDatabase();
    // Closing the database on a stop folds the write-ahead log into gravity.db, so a copy of the file is complete.
    const shutdown = () => {
      closeDatabase();
      process.exit(0);
    };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
  }
}

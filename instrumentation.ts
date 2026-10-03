/** Runs once when a Next.js server starts: opening the database applies any pending migrations. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDatabase } = await import("@/lib/db");
    getDatabase();
  }
}

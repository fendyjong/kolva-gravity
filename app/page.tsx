import { connection } from "next/server";
import { DoneToday } from "@/components/DoneToday";
import { Quadrant } from "@/components/Quadrant";
import { formatSummary, formatTime } from "@/lib/format";
import { QUADRANTS } from "@/lib/quadrants";
import { appTimeZone, getTaskStore } from "@/lib/tasks";

export default async function Home() {
  // Render at request time: the database read below must not be frozen at build time.
  await connection();
  const store = getTaskStore();
  const open = store.getMatrix();
  const summary = store.getSummary();
  const timeZone = appTimeZone();
  const done = store.getDoneToday().map((task) => ({
    id: task.id,
    description: task.description,
    completedAt: task.completed_at,
    time: formatTime(task.completed_at, timeZone),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Gravity</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{formatSummary(summary)}</p>
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUADRANTS.map((quadrant) => (
          <Quadrant
            key={quadrant.id}
            quadrant={quadrant.id}
            name={quadrant.name}
            tasks={open.filter((task) => task.quadrant === quadrant.id)}
          />
        ))}
      </div>
      <DoneToday items={done} />
    </main>
  );
}

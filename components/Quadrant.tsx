"use client";

import { useState } from "react";
import { VISIBLE_PER_QUADRANT } from "@/lib/limits";
import type { Quadrant as QuadrantNumber, TaskView } from "@/lib/tasks/types";
import { AddTask } from "./AddTask";
import { TaskRow } from "./TaskRow";

export function Quadrant({
  quadrant,
  name,
  tasks,
}: {
  quadrant: QuadrantNumber;
  name: string;
  tasks: TaskView[];
}) {
  // Rule 13: the toggle state lives only in the browser and is not saved.
  const [expanded, setExpanded] = useState(false);
  const first = quadrant === 1;
  const limited = !first && !expanded;
  const visible = limited ? tasks.slice(0, VISIBLE_PER_QUADRANT) : tasks;
  const hidden = tasks.length - visible.length;
  const headingId = `quadrant-${quadrant}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={
        first
          ? "rounded-xl border-2 border-amber-500 bg-white shadow-sm dark:border-amber-400 dark:bg-zinc-900"
          : "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }
    >
      <header
        className={`sticky top-0 z-10 flex min-h-11 flex-wrap items-baseline gap-x-2 gap-y-1 rounded-t-xl px-3 py-2 md:static ${
          first ? "bg-amber-50 dark:bg-amber-950" : "bg-white dark:bg-zinc-900"
        }`}
      >
        <h2 id={headingId} className={first ? "text-lg font-bold" : "text-base font-semibold"}>
          {name}
        </h2>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{tasks.length} open</span>
        {hidden > 0 && <span className="text-sm text-zinc-500 dark:text-zinc-400">+{hidden} more</span>}
      </header>
      <ul>
        {visible.map((task) => (
          <TaskRow key={task.id} task={task} count={tasks.length} />
        ))}
      </ul>
      {!first && tasks.length > VISIBLE_PER_QUADRANT && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="min-h-11 w-full border-t border-zinc-200 px-3 text-left text-sm text-zinc-600 hover:underline dark:border-zinc-800 dark:text-zinc-400"
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </button>
      )}
      <AddTask quadrant={quadrant} name={name} />
    </section>
  );
}

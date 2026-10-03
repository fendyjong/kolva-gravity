"use client";

import { useTransition } from "react";
import { reopenTask } from "@/app/actions";

export interface DoneItem {
  id: number;
  description: string;
  completedAt: string;
  /** `HH:mm` in APP_TZ. */
  time: string;
}

export function DoneToday({ items }: { items: DoneItem[] }) {
  const [pending, startTransition] = useTransition();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="done-today-heading" className="mt-6">
      <h2 id="done-today-heading" className="mb-2 text-base font-semibold">
        Done today
      </h2>
      <ul className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-h-11 items-center gap-3 border-t border-zinc-200 px-3 first:border-t-0 dark:border-zinc-800"
          >
            <time dateTime={item.completedAt} className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
              {item.time}
            </time>
            <span className="min-w-0 flex-1 break-words text-zinc-500 line-through dark:text-zinc-400">
              {item.description}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await reopenTask(item.id);
                })
              }
              aria-label={`Undo ${item.description}`}
              className="min-h-11 shrink-0 rounded-md px-3 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-300 dark:hover:bg-amber-950"
            >
              Undo
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

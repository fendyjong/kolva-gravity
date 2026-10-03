"use client";

import { useState, useTransition } from "react";
import { dropTask, moveTask, type ActionResult } from "@/app/actions";
import { QUADRANTS } from "@/lib/quadrants";
import type { TaskView } from "@/lib/tasks/types";

const BUTTON =
  "min-h-11 rounded-md border border-zinc-300 px-3 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800";

export function TaskMenu({
  id,
  task,
  count,
  onResult,
}: {
  /** The element id the row's ⋯ button points at with aria-controls. */
  id: string;
  task: TaskView;
  /** Open tasks in this task's quadrant. */
  count: number;
  onResult: (error: string | null) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState(false);
  const [confirmingDrop, setConfirmingDrop] = useState(false);
  const quadrant = task.quadrant;

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      onResult(result.error);
    });
  }

  return (
    <div
      id={id}
      role="group"
      aria-label={`Actions for ${task.description}`}
      className="flex flex-wrap gap-2 px-3 pb-3"
    >
      <button
        type="button"
        className={BUTTON}
        disabled={pending || quadrant === 1}
        onClick={() => run(() => moveTask(task.id, quadrant - 1))}
      >
        Move up a quadrant
      </button>
      <button
        type="button"
        className={BUTTON}
        disabled={pending || quadrant === 4}
        onClick={() => run(() => moveTask(task.id, quadrant + 1))}
      >
        Move down a quadrant
      </button>
      <button
        type="button"
        className={BUTTON}
        aria-expanded={choosing}
        disabled={pending}
        onClick={() => setChoosing((open) => !open)}
      >
        Move to quadrant…
      </button>
      <button
        type="button"
        className={BUTTON}
        disabled={pending || task.position === 0}
        onClick={() => run(() => moveTask(task.id, quadrant, task.position - 1))}
      >
        Up within quadrant
      </button>
      <button
        type="button"
        className={BUTTON}
        disabled={pending || task.position >= count - 1}
        onClick={() => run(() => moveTask(task.id, quadrant, task.position + 1))}
      >
        Down within quadrant
      </button>
      {confirmingDrop ? (
        <button
          type="button"
          className={`${BUTTON} border-red-600 font-medium text-red-700 dark:border-red-500 dark:text-red-400`}
          disabled={pending}
          onClick={() => run(() => dropTask(task.id))}
        >
          Confirm drop
        </button>
      ) : (
        <button type="button" className={BUTTON} disabled={pending} onClick={() => setConfirmingDrop(true)}>
          Drop
        </button>
      )}
      {choosing && (
        <div role="group" aria-label="Move to quadrant" className="flex w-full flex-wrap gap-2">
          {QUADRANTS.filter((target) => target.id !== quadrant).map((target) => (
            <button
              key={target.id}
              type="button"
              className={BUTTON}
              disabled={pending}
              onClick={() => run(() => moveTask(task.id, target.id))}
            >
              {target.id} · {target.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { completeTask, updateTask } from "@/app/actions";
import { carryOverTone, issueLabel } from "@/lib/format";
import type { TaskView } from "@/lib/tasks/types";
import { Badge } from "./Badge";
import { TaskMenu } from "./TaskMenu";

export function TaskRow({ task, count }: { task: TaskView; count: number }) {
  const [done, setDone] = useOptimistic(false);
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelEdit = useRef(false);
  const tone = carryOverTone(task.carry_over_days);
  const menuId = `task-${task.id}-menu`;

  function complete() {
    startTransition(async () => {
      setDone(true);
      const result = await completeTask(task.id);
      setError(result.error);
    });
  }

  function finishEdit(value: string) {
    setEditing(false);
    if (cancelEdit.current) {
      cancelEdit.current = false;
      return;
    }
    if (value.trim() === task.description) return;
    startTransition(async () => {
      const result = await updateTask(task.id, value);
      setError(result.error);
    });
  }

  return (
    <li className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="flex items-start gap-1 px-1">
        <label className="flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={done}
            disabled={done}
            onChange={complete}
            aria-label={`Complete ${task.description}`}
            className="size-5 accent-amber-600"
          />
        </label>
        <div className="min-w-0 flex-1 py-1">
          {editing ? (
            <input
              ref={(input) => input?.focus()}
              defaultValue={task.description}
              maxLength={200}
              aria-label={`Edit ${task.description}`}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  cancelEdit.current = true;
                  event.currentTarget.blur();
                }
              }}
              onBlur={(event) => finishEdit(event.currentTarget.value)}
              className="min-h-11 w-full rounded-md border border-amber-500 bg-transparent px-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          ) : (
            <button
              type="button"
              title="Edit"
              onClick={() => setEditing(true)}
              className={`min-h-11 w-full break-words rounded-md px-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                done ? "text-zinc-400 line-through" : ""
              }`}
            >
              {task.description}
            </button>
          )}
          <div className="flex flex-wrap gap-1.5 px-1 pb-1.5">
            {tone && (
              <Badge label="Carried over" tone={tone}>
                {task.carry_over_days}d over
              </Badge>
            )}
            <Badge label="Age">{task.age_days}d</Badge>
            {task.demotions > 0 && <Badge label="Demoted">↓{task.demotions}</Badge>}
            {task.issue_url && (
              <Badge label="Issue" href={task.issue_url}>
                {issueLabel(task.issue_url)}
              </Badge>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={`Actions for ${task.description}`}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-xl leading-none text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ⋯
        </button>
      </div>
      {error && (
        <p role="alert" className="px-12 pb-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {menuOpen && <TaskMenu id={menuId} task={task} count={count} onResult={setError} />}
    </li>
  );
}

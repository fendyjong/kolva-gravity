"use client";

import { useOptimistic, useTransition } from "react";
import { completeTask } from "@/app/actions";
import { carryOverTone, issueLabel } from "@/lib/format";
import type { TaskView } from "@/lib/tasks/types";
import { Badge } from "./Badge";

export function TaskRow({ task }: { task: TaskView }) {
  const [done, setDone] = useOptimistic(false);
  const [, startTransition] = useTransition();
  const tone = carryOverTone(task.carry_over_days);

  function complete() {
    startTransition(async () => {
      setDone(true);
      await completeTask(task.id);
    });
  }

  return (
    <li className="flex items-start gap-1 border-t border-zinc-200 px-1 dark:border-zinc-800">
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
      <div className="min-w-0 flex-1 py-2.5">
        <p className={done ? "break-words text-zinc-400 line-through" : "break-words"}>
          {task.description}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
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
    </li>
  );
}

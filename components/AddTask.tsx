"use client";

import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Quadrant } from "@/lib/tasks/types";

export function AddTask({ quadrant, name }: { quadrant: Quadrant; name: string }) {
  const [error, setError] = useState<string | null>(null);

  // A form action runs in a transition and React resets the form when it finishes.
  async function submit(formData: FormData) {
    const result = await addTask(quadrant, String(formData.get("description") ?? ""));
    setError(result.error);
  }

  return (
    <form action={submit} className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <input
        name="description"
        required
        maxLength={200}
        autoComplete="off"
        placeholder="Add task"
        aria-label={`Add task to ${name}`}
        className="min-h-11 w-full rounded-md bg-transparent px-2 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}

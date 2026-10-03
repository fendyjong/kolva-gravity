"use server";

import { revalidatePath } from "next/cache";
import { getTaskStore, TaskError } from "@/lib/tasks";

export type ActionResult = { error: string | null };

/** Runs one task-module change; a broken rule comes back as a message instead of an exception. */
async function run(change: () => unknown): Promise<ActionResult> {
  try {
    change();
  } catch (error) {
    if (error instanceof TaskError) return { error: error.message };
    throw error;
  }
  revalidatePath("/");
  return { error: null };
}

export async function addTask(quadrant: number, description: string): Promise<ActionResult> {
  return run(() => getTaskStore().add({ description, quadrant }));
}

export async function completeTask(id: number): Promise<ActionResult> {
  return run(() => getTaskStore().complete(id));
}

export async function reopenTask(id: number): Promise<ActionResult> {
  return run(() => getTaskStore().reopen(id));
}

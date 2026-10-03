export type Quadrant = 1 | 2 | 3 | 4;

/** One row of the `tasks` table. */
export interface Task {
  id: number;
  description: string;
  quadrant: Quadrant;
  /** Order among the open tasks in the quadrant; 0 is the top. Meaningless once closed. */
  position: number;
  issue_url: string | null;
  created_at: string;
  completed_at: string | null;
  dropped_at: string | null;
  /** When the task last entered quadrant 1; null outside quadrant 1. */
  q1_since: string | null;
  demotions: number;
}

/** A task plus the values computed when it is read (spec rules 5 and 6). */
export interface TaskView extends Task {
  age_days: number;
  /** Local days since q1_since; 0 unless the task is open and in quadrant 1. */
  carry_over_days: number;
}

export type DoneTaskView = TaskView & { completed_at: string };

export interface AddTaskInput {
  description: string;
  quadrant: number;
  issue_url?: string | null;
  position?: number | null;
}

export interface AddResult {
  task: TaskView;
  /** True when a task with this issue_url already existed (rule 3); nothing changed. */
  existing: boolean;
}

/** The summary line: `Today X/Y done · C carried over · oldest open Nd`. */
export interface Summary {
  /** X: quadrant-1 tasks completed today (local date). */
  doneToday: number;
  /** Y: X + the number of open quadrant-1 tasks. */
  totalToday: number;
  /** C: open quadrant-1 tasks with a carry-over of 1 or more. */
  carriedOver: number;
  /** N: the largest age among open tasks; null when nothing is open. */
  oldestOpenDays: number | null;
}

export type TaskErrorCode = "not_found" | "closed" | "invalid";

/** A broken rule or an unknown id. The message says what is needed. */
export class TaskError extends Error {
  readonly code: TaskErrorCode;

  constructor(code: TaskErrorCode, message: string) {
    super(message);
    this.name = "TaskError";
    this.code = code;
  }
}

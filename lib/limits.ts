/** Spec rule 13: quadrants 2–4 show this many tasks, then a "+N more" toggle. Quadrant 1 always shows every task. */
export const VISIBLE_PER_QUADRANT = 5;

/** Spec rule 5: a quadrant-1 task's badge turns amber after this many local days in Next version. */
export const VERSION_AMBER_DAYS = 5;

/**
 * Spec rule 5: the badge turns red at this many days, and triage takes the task out unless it is urgent.
 * The summary line calls these tasks "over a week", which assumes 7.
 */
export const VERSION_STALE_DAYS = 7;

/** The triage prompt adds roadmap work only while Next version's points stay within this. */
export const VERSION_BUDGET = 10;

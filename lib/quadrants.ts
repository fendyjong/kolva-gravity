import type { Quadrant } from "@/lib/tasks/types";

/** In grid order: top-left, top-right, bottom-left, bottom-right. */
export const QUADRANTS: readonly { id: Quadrant; name: string }[] = [
  { id: 1, name: "Next version" },
  { id: 2, name: "Schedule" },
  { id: 3, name: "Delegate" },
  { id: 4, name: "Later" },
];

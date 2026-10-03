import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100",
  red: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100",
} as const;

export function Badge({
  label,
  tone = "neutral",
  href,
  children,
}: {
  /** Read by screen readers before the badge text, e.g. "Age". */
  label: string;
  tone?: keyof typeof TONES;
  href?: string;
  children: ReactNode;
}) {
  const className = `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${TONES[tone]}`;
  const content = (
    <>
      <span className="sr-only">{label}: </span>
      {children}
    </>
  );
  if (href) {
    return (
      // The ::after box stretches the hit area to 44px tall (tap-target rule) without making the row taller.
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={label}
        className={`${className} relative underline-offset-2 hover:underline after:absolute after:inset-x-0 after:-inset-y-3 after:content-['']`}
      >
        {content}
      </a>
    );
  }
  return (
    <span title={label} className={className}>
      {content}
    </span>
  );
}

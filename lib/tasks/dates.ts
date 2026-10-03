const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, format);
  }
  return format;
}

/** The calendar date (YYYY-MM-DD) of `instant` in `timeZone`. */
export function localDate(instant: Date, timeZone: string): string {
  const parts = formatter(timeZone).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Whole local days from the date of `fromIso` to the date of `now`, both in `timeZone` (spec rules 5 and 6). */
export function localDaysBetween(fromIso: string, now: Date, timeZone: string): number {
  const from = Date.parse(`${localDate(new Date(fromIso), timeZone)}T00:00:00Z`);
  const to = Date.parse(`${localDate(now, timeZone)}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

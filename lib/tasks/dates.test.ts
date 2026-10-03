import { describe, expect, it } from "vitest";
import { localDate, localDaysBetween } from "./dates";

describe("localDate", () => {
  it("returns the calendar date in the given time zone", () => {
    expect(localDate(new Date("2026-10-02T16:59:00Z"), "Asia/Jakarta")).toBe("2026-10-02");
    expect(localDate(new Date("2026-10-02T17:00:00Z"), "Asia/Jakarta")).toBe("2026-10-03");
    expect(localDate(new Date("2026-10-02T17:00:00Z"), "UTC")).toBe("2026-10-02");
  });
});

describe("localDaysBetween", () => {
  it("counts calendar days in the time zone, not 24-hour periods", () => {
    // 23:59 WIB on 2 Oct -> 00:01 WIB on 3 Oct is one local day.
    expect(localDaysBetween("2026-10-02T16:59:00.000Z", new Date("2026-10-02T17:01:00Z"), "Asia/Jakarta")).toBe(1);
    // 00:00 -> 23:59 WIB on the same date is zero.
    expect(localDaysBetween("2026-10-02T17:00:00.000Z", new Date("2026-10-03T16:59:00Z"), "Asia/Jakarta")).toBe(0);
    expect(localDaysBetween("2026-09-28T02:00:00.000Z", new Date("2026-10-03T02:00:00Z"), "Asia/Jakarta")).toBe(5);
  });
});

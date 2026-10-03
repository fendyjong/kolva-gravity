import { describe, expect, it } from "vitest";
import { carryOverTone, formatSummary, formatTime, issueLabel } from "./format";

describe("formatSummary", () => {
  it("formats the full summary line", () => {
    expect(
      formatSummary({ doneToday: 2, totalToday: 5, carriedOver: 1, oldestOpenDays: 12 }),
    ).toBe("Today 2/5 done · 1 carried over · oldest open 12d");
  });

  it("leaves out oldest open when nothing is open", () => {
    expect(
      formatSummary({ doneToday: 0, totalToday: 0, carriedOver: 0, oldestOpenDays: null }),
    ).toBe("Today 0/0 done · 0 carried over");
  });
});

describe("carryOverTone", () => {
  it("shows nothing at 0, amber at 1–2 and red at 3 or more", () => {
    expect(carryOverTone(0)).toBeNull();
    expect(carryOverTone(1)).toBe("amber");
    expect(carryOverTone(2)).toBe("amber");
    expect(carryOverTone(3)).toBe("red");
    expect(carryOverTone(40)).toBe("red");
  });
});

describe("issueLabel", () => {
  it("shortens a GitHub issue URL to repo#number", () => {
    expect(issueLabel("https://github.com/fendyjong/kolva-gravity/issues/12")).toBe("kolva-gravity#12");
  });
});

describe("formatTime", () => {
  it("shows the 24-hour local time", () => {
    expect(formatTime("2026-10-03T02:05:00.000Z", "Asia/Jakarta")).toBe("09:05");
    expect(formatTime("2026-10-03T16:30:00.000Z", "Asia/Jakarta")).toBe("23:30");
  });
});

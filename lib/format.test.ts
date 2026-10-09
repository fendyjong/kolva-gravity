import { describe, expect, it } from "vitest";
import { carryOverTone, formatSummary, formatTime, issueLabel } from "./format";

describe("formatSummary", () => {
  it("formats the full summary line", () => {
    expect(formatSummary({ versionOpen: 6, versionStale: 1, oldestOpenDays: 12 })).toBe(
      "Next version 6 open · 1 over a week · oldest open 12d",
    );
  });

  it("leaves out oldest open when nothing is open", () => {
    expect(formatSummary({ versionOpen: 0, versionStale: 0, oldestOpenDays: null })).toBe(
      "Next version 0 open · 0 over a week",
    );
  });
});

describe("carryOverTone", () => {
  it("shows nothing below 5 days, amber at 5–6 and red at 7 or more", () => {
    expect(carryOverTone(0)).toBeNull();
    expect(carryOverTone(4)).toBeNull();
    expect(carryOverTone(5)).toBe("amber");
    expect(carryOverTone(6)).toBe("amber");
    expect(carryOverTone(7)).toBe("red");
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

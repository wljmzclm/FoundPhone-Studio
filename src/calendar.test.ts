import { describe, expect, it } from "vitest";
import { calendarOccursOn } from "./calendar";

describe("calendar anniversaries", () => {
  it("repeats the January birthday only from 2023 onward", () => {
    const item = { time: "2023-01-08", meta: { repeat: "yearly" } };
    expect(calendarOccursOn(item, "2022-01-08")).toBe(false);
    expect(calendarOccursOn(item, "2023-01-08")).toBe(true);
    expect(calendarOccursOn(item, "2035-01-08")).toBe(true);
    expect(calendarOccursOn(item, "2026-01-09")).toBe(false);
  });
  it("keeps the public day exclusive to October 6, 2025", () => {
    const item = { time: "2025-10-06", meta: {} };
    expect(calendarOccursOn(item, "2025-10-06")).toBe(true);
    expect(calendarOccursOn(item, "2024-10-06")).toBe(false);
    expect(calendarOccursOn(item, "2026-10-06")).toBe(false);
  });
});

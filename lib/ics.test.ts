import { describe, expect, it } from "vitest";
import { nextHomeworkNight, weeklyReminder } from "./ics";

describe("weekly reminder", () => {
  it("starts the evening after today, at 6 pm", () => {
    const night = nextHomeworkNight(new Date(2026, 10, 30, 21, 15));
    expect([night.getFullYear(), night.getMonth(), night.getDate(), night.getHours()]).toEqual([2026, 11, 1, 18]);
  });

  it("is a weekly event in local time", () => {
    const ics = weeklyReminder(new Date(2026, 10, 16, 18, 0), "https://example.test", new Date(Date.UTC(2026, 10, 15, 7, 5, 9)));
    const lines = ics.split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("DTSTART:20261116T180000");
    expect(lines).toContain("DTSTAMP:20261115T070509Z");
    expect(lines).toContain("RRULE:FREQ=WEEKLY");
    expect(lines).toContain("URL:https://example.test");
    expect(lines).toContain("END:VCALENDAR");
  });

  it("escapes commas and line breaks in text", () => {
    const ics = weeklyReminder(new Date(2026, 10, 16, 18, 0), "https://example.test");
    expect(ics).toContain("DESCRIPTION:Check tonight's worksheet with SameWay\\, and see if the last fix stuck.\\nhttps://example.test");
  });
});

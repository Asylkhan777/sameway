import { describe, expect, it } from "vitest";
import type { SheetItem } from "@/lib/engine";
import { diagnoseSheet } from "@/lib/engine";
import { parseLine } from "./parse";
import {
  practiceTarget,
  recheckedSinceFixed,
  recordPractice,
  recordWorksheet,
  setChildName,
  verdictOf,
  worksheetSummary,
} from "./progress";
import { interpret } from "./report";
import type { Progress, WorksheetRecord } from "./storage";
import { EMPTY_PROGRESS } from "./storage";

const items = (...lines: string[]): SheetItem[] =>
  lines.map((line) => {
    const entry = parseLine(line);
    if (!entry || entry.answer === null) throw new Error(`bad test line: ${line}`);
    return { problem: { op: entry.op, a: entry.a, b: entry.b }, answer: entry.answer };
  });

/** A checked worksheet, diagnosed by the engine the way the app does it. */
const sheet = (id: string, day: number, lines: string[], source: WorksheetRecord["source"] = "typed"): WorksheetRecord => {
  const list = items(...lines);
  return { id, at: at(day), source, items: list, verdict: verdictOf(interpret(diagnoseSheet(list))) };
};

const at = (day: number, hour = 18): string => new Date(Date.UTC(2026, 10, day, hour)).toISOString();

const FLIPS = ["52-18=46", "63-27=44", "45-21=24"];
const FAMILY = "sub-smaller-from-larger";

const check = (progress: Progress, ...sheets: WorksheetRecord[]): Progress => sheets.reduce(recordWorksheet, progress);

describe("a rule's status", () => {
  it("is found when a worksheet shows it", () => {
    const progress = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS));
    expect(progress.rules[FAMILY]).toMatchObject({
      title: "Subtracts the smaller digit from the bigger one",
      status: "found",
      seenOn: 1,
      firstSeen: at(1),
      lastSeen: at(1),
      practice: [],
    });
  });

  it("is practicing after a round with a miss, and fixed after a round with none", () => {
    let progress = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS));
    progress = recordPractice(progress, FAMILY, { at: at(1, 19), results: [true, false, true] });
    expect(progress.rules[FAMILY].status).toBe("practicing");
    progress = recordPractice(progress, FAMILY, { at: at(3), results: [true, true, true] });
    expect(progress.rules[FAMILY].status).toBe("fixed");
    expect(progress.rules[FAMILY].practice).toHaveLength(2);
  });

  it("a round saved again under the same start time replaces itself", () => {
    let progress = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS));
    progress = recordPractice(progress, FAMILY, { at: at(2), results: [true, false, false] });
    progress = recordPractice(progress, FAMILY, { at: at(2), results: [true, true, true] });
    expect(progress.rules[FAMILY].practice).toEqual([{ at: at(2), results: [true, true, true] }]);
    expect(progress.rules[FAMILY].status).toBe("fixed");
  });

  it("goes back to practicing when a fixed rule shows up on a later worksheet", () => {
    let progress = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS));
    progress = recordPractice(progress, FAMILY, { at: at(2), results: [true, true, true] });
    progress = check(progress, sheet("w2", 5, ["71-46=35", "94-58=44"]));
    expect(progress.rules[FAMILY]).toMatchObject({ status: "practicing", cameBack: true, seenOn: 2, lastSeen: at(5) });
    progress = recordPractice(progress, FAMILY, { at: at(6), results: [true, true, true] });
    expect(progress.rules[FAMILY].status).toBe("fixed");
    expect(progress.rules[FAMILY].cameBack).toBeUndefined();
  });

  it("ignores practice for a rule that was never found", () => {
    expect(recordPractice(EMPTY_PROGRESS, FAMILY, { at: at(1), results: [true] })).toBe(EMPTY_PROGRESS);
  });
});

describe("recording a worksheet", () => {
  it("checking the same worksheet again replaces its record", () => {
    let progress = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS));
    // The parent corrects the table: the answers were right after all.
    progress = check(progress, sheet("w1", 2, ["52-18=34", "63-27=36", "45-21=24"]));
    expect(progress.worksheets).toHaveLength(1);
    expect(progress.worksheets[0]).toMatchObject({ at: at(1), verdict: { kind: "all-correct" } });
    expect(progress.rules).toEqual({});
    expect(progress.ownWorksheetsUsed).toBe(1);
  });

  it("counts own worksheets, not samples", () => {
    const progress = check(
      EMPTY_PROGRESS,
      sheet("s1", 1, FLIPS, "sample"),
      sheet("w1", 2, FLIPS, "photo"),
      sheet("w2", 3, FLIPS),
    );
    expect(progress.ownWorksheetsUsed).toBe(2);
    expect(progress.rules[FAMILY].seenOn).toBe(3);
  });

  it("a lead that was not confirmed is not a rule yet", () => {
    const progress = check(EMPTY_PROGRESS, sheet("w1", 1, ["52-18=46"]));
    expect(progress.worksheets[0].verdict).toEqual({ kind: "maybe" });
    expect(progress.rules).toEqual({});
  });

  it("keeps worksheets in time order", () => {
    const progress = check(EMPTY_PROGRESS, sheet("late", 9, FLIPS), sheet("early", 2, FLIPS));
    expect(progress.worksheets.map((w) => w.id)).toEqual(["early", "late"]);
    expect(progress.rules[FAMILY]).toMatchObject({ firstSeen: at(2), lastSeen: at(9) });
  });
});

describe("practiceTarget", () => {
  it("is the rule and the child's own problem from the latest worksheet that showed it", () => {
    const progress = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS), sheet("w2", 4, ["45-21=24", "94-58=44", "71-46=35"]));
    const target = practiceTarget(progress.worksheets, FAMILY);
    expect(target?.bug.id).toBe("sub-smaller-from-larger");
    expect(target?.like).toEqual({ op: "-", a: 94, b: 58 });
  });

  it("is null for a rule no worksheet showed", () => {
    expect(practiceTarget([], FAMILY)).toBeNull();
  });
});

describe("recheckedSinceFixed", () => {
  const fixed = recordPractice(check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS)), FAMILY, {
    at: at(2),
    results: [true, true, true],
  });

  it("counts later worksheets that could have tripped the rule and didn't", () => {
    const progress = check(
      fixed,
      sheet("w2", 5, ["47+38=85", "56+27=83"]), // addition: the rule can't show up here
      sheet("w3", 8, ["52-18=34", "63-27=36"]), // regrouping needed, and done right
    );
    expect(recheckedSinceFixed(progress.worksheets, FAMILY, progress.rules[FAMILY])).toBe(1);
  });

  it("is zero until the rule is fixed", () => {
    const found = check(EMPTY_PROGRESS, sheet("w1", 1, FLIPS));
    expect(recheckedSinceFixed(found.worksheets, FAMILY, found.rules[FAMILY])).toBe(0);
  });
});

describe("worksheetSummary", () => {
  it("names the operation, the wrong answers and the outcome", () => {
    expect(worksheetSummary(sheet("w", 1, ["52-18=46", "63-27=44", "45-21=24", "71-46=35", "80-35=55", "94-58=44"]))).toBe(
      "6 subtraction problems · 5 wrong · rule found",
    );
    expect(worksheetSummary(sheet("w", 1, ["47+38=85", "56+27=83"]))).toBe("2 addition problems · all correct");
    expect(worksheetSummary(sheet("w", 1, ["52-18=46"]))).toBe(
      "1 subtraction problem · 1 wrong · one possible rule, not confirmed",
    );
    expect(worksheetSummary(sheet("w", 1, ["47+38=85", "23x45=1035"]))).toBe("2 problems · all correct");
  });
});

describe("setChildName", () => {
  it("trims the name and drops an empty one", () => {
    expect(setChildName(EMPTY_PROGRESS, "  Maya ").child).toEqual({ name: "Maya" });
    expect(setChildName(setChildName(EMPTY_PROGRESS, "Maya"), "  ").child).toEqual({});
  });
});

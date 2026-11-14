import { describe, expect, it } from "vitest";
import { buildDemo } from "./demo";
import { recheckedSinceFixed, worksheetSummary } from "./progress";

const NOW = Date.UTC(2026, 10, 15, 7);
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (iso: string): number => Math.round((NOW - Date.parse(iso)) / DAY_MS);

describe("demo: 3 weeks with Maya", () => {
  const demo = buildDemo(NOW);

  it("has four worksheets over three weeks, summarized by the engine", () => {
    expect(demo.worksheets.map((w) => [daysAgo(w.at), worksheetSummary(w)])).toEqual([
      [20, "6 subtraction problems · 5 wrong · rule found"],
      [13, "4 addition problems · all correct"],
      [6, "6 subtraction problems · 5 wrong · rule found"],
      [1, "5 multiplication problems · 5 wrong · rule found"],
    ]);
  });

  it("smaller-from-larger: found, 1 of 3, then 3 of 3 → fixed, and it held on a later worksheet", () => {
    const rule = demo.rules["sub-smaller-from-larger"];
    expect(rule.status).toBe("fixed");
    expect(rule.practice.map((round) => round.results.filter(Boolean).length)).toEqual([1, 3]);
    expect(rule.practice.map((round) => daysAgo(round.at))).toEqual([20, 18]);
    expect(recheckedSinceFixed(demo.worksheets, "sub-smaller-from-larger", rule)).toBe(1);
  });

  it("across zeros: 2 of 3 → practicing", () => {
    const rule = demo.rules["sub-across-zero"];
    expect(rule.status).toBe("practicing");
    expect(rule.practice.map((round) => round.results)).toEqual([[true, false, true]]);
  });

  it("missing placeholder zero: found yesterday, not practiced yet", () => {
    expect(demo.rules["mul2-no-placeholder-zero"]).toMatchObject({ status: "found", seenOn: 1, practice: [] });
  });

  it("is Maya's, uses no own worksheets of the visitor and is not on Plus", () => {
    expect(demo.child.name).toBe("Maya");
    expect(demo.plus).toBeNull();
    expect(Object.keys(demo.rules)).toHaveLength(3);
  });
});

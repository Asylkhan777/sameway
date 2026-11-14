import { describe, expect, it } from "vitest";
import { diagnose, diagnoseSheet, solve } from "@/lib/engine";
import type { SheetItem } from "@/lib/engine";
import { parseLine } from "./parse";
import { interpret, summarize } from "./report";
import { SAMPLES } from "./samples";

/** Build worksheet items from typed lines, the same way the app does. */
const sheet = (...lines: string[]): SheetItem[] =>
  lines.map((line) => {
    const entry = parseLine(line);
    if (!entry || entry.answer === null) throw new Error(`bad test line: ${line}`);
    return { problem: { op: entry.op, a: entry.a, b: entry.b }, answer: entry.answer };
  });

const sampleItems = (id: string): SheetItem[] => {
  const sample = SAMPLES.find((s) => s.id === id);
  if (!sample) throw new Error(`no sample ${id}`);
  return sample.entries.map((e) => ({ problem: { op: e.op, a: e.a, b: e.b }, answer: e.answer ?? -1 }));
};

describe("the sample worksheets", () => {
  const expected = [
    ["a", "sub-smaller-from-larger", "Subtracts the smaller digit from the bigger one", "5 of 6 wrong · one rule explains all 5"],
    ["b", "mul2-no-placeholder-zero", "Forgets the zero on the second row", "5 of 5 wrong · one rule explains all 5"],
    ["c", "sub-across-zero", "Adds 10 without taking it from the zero next door", "5 of 6 wrong · one rule explains all 5"],
  ];
  for (const [id, family, title, summary] of expected) {
    it(`sample ${id.toUpperCase()} → ${family}`, () => {
      const report = diagnoseSheet(sampleItems(id));
      const finding = interpret(report);
      expect(finding.kind).toBe("pattern");
      if (finding.kind !== "pattern") return;
      expect(finding.evidence.family).toBe(family);
      expect(finding.evidence.explained).toBe(5);
      expect(finding.example.bug.title).toBe(title);
      expect(summarize(report)).toBe(summary);
    });
  }

  it("the example is the first answer on the sheet that the rule reproduces", () => {
    const finding = interpret(diagnoseSheet(sampleItems("a")));
    if (finding.kind !== "pattern") throw new Error("expected a pattern");
    const { problem, answer, bug } = finding.example;
    expect([problem.a, problem.b, answer]).toEqual([52, 18, 46]);
    expect(bug.run(problem)).toBe(answer);
  });
});

describe("interpret", () => {
  it("changing one answer changes the diagnosis", () => {
    const original = interpret(diagnoseSheet(sampleItems("b")));
    const items = sampleItems("b");
    items[0] = { ...items[0], answer: 815 };
    const edited = diagnoseSheet(items);
    expect(original.kind === "pattern" && original.evidence.explained).toBe(5);
    const finding = interpret(edited);
    expect(finding.kind === "pattern" && finding.evidence.explained).toBe(4);
    expect(summarize(edited)).toBe("5 of 5 wrong · one rule explains 4 of them");
  });

  it("a single answer that fits one rule is a lead, with a problem to confirm it", () => {
    const report = diagnoseSheet(sheet("52-18=46"));
    const finding = interpret(report);
    expect(finding.kind).toBe("maybe");
    if (finding.kind !== "maybe") return;
    expect(finding.evidence.family).toBe("sub-smaller-from-larger");
    expect(finding.check).not.toBeNull();
    if (finding.check) {
      expect(finding.check.correct).toBe(solve(finding.check.problem));
      expect(finding.example.bug.run(finding.check.problem)).toBe(finding.check.buggy);
    }
    expect(summarize(report)).toBe("1 of 1 wrong · one possible rule");
  });

  it("a single answer that fits two rules is a tie with a check problem that separates them", () => {
    const report = diagnoseSheet(sheet("300-187=287"));
    const finding = interpret(report);
    expect(finding.kind).toBe("tie");
    if (finding.kind !== "tie") return;
    expect(finding.candidates.map((c) => c.family).sort()).toEqual(["sub-smaller-from-larger", "sub-zero-minus-n"]);
    expect(finding.probe).not.toBeNull();
    if (!finding.probe) return;
    const predictions = finding.probe.expected.flatMap((e) => e.answers);
    expect(new Set(predictions).size).toBe(predictions.length);
    for (const e of finding.probe.expected) {
      if (!e.applies) expect(e.answers).toEqual([finding.probe.correct]);
      else for (const a of e.answers) expect(diagnose(finding.probe.problem, a).kind).toBe("bug");
    }
    expect(summarize(report)).toBe("1 of 1 wrong · two rules fit equally");
  });

  it("slips are not called a rule", () => {
    const report = diagnoseSheet(sheet("52-18=33", "63-27=37", "45-21=24", "71-46=25"));
    expect(interpret(report).kind).toBe("no-pattern");
    expect(summarize(report)).toBe("2 of 4 wrong · no repeating rule");
  });

  it("a clean sheet is all correct", () => {
    const report = diagnoseSheet(sheet("47+38=85", "56+27=83", "68+17=85", "29+46=75"));
    expect(interpret(report).kind).toBe("all-correct");
    expect(summarize(report)).toBe("All 4 correct");
    expect(summarize(diagnoseSheet(sheet("47+38=85")))).toBe("1 of 1 correct");
  });

  it("two matching answers read as 'both'", () => {
    const report = diagnoseSheet(sheet("52-18=46", "63-27=44", "45-21=24"));
    expect(summarize(report)).toBe("2 of 3 wrong · one rule explains both");
  });
});

import { describe, expect, it } from "vitest";
import { diagnoseSheet } from "@/lib/engine";
import type { SheetItem } from "@/lib/engine";
import { checkProblem, settle } from "./check";
import { parseLine } from "./parse";
import { interpret } from "./report";

const sheet = (...lines: string[]): SheetItem[] =>
  lines.map((line) => {
    const entry = parseLine(line);
    if (!entry || entry.answer === null) throw new Error(`bad test line: ${line}`);
    return { problem: { op: entry.op, a: entry.a, b: entry.b }, answer: entry.answer };
  });

/** An answer no rule predicts and that isn't right either. */
const NONSENSE = 9876;

describe("settling a tie with one check problem", () => {
  const report = diagnoseSheet(sheet("300-187=287"));
  const finding = interpret(report);
  if (finding.kind !== "tie" || !finding.probe) throw new Error("expected a tie with a check problem");
  const { probe } = finding;

  it("asks the engine's check problem", () => {
    expect(checkProblem(finding)).toEqual(probe.problem);
  });

  it("each rule's predicted answer names that rule", () => {
    for (const expected of probe.expected) {
      for (const answer of expected.answers) {
        const settled = settle(report, finding, answer);
        expect(settled?.kind).toBe("pattern");
        if (settled?.kind !== "pattern") continue;
        expect(settled.evidence.family).toBe(expected.family);
        expect(settled.confirmedBy).toEqual({ problem: probe.problem, answer });
        // The explanation still points at the child's own worksheet answer.
        expect(settled.example.answer).toBe(287);
      }
    }
  });

  it("the right answer is a one-off when every rule would have gone wrong", () => {
    expect(probe.expected.every((e) => e.applies)).toBe(true);
    expect(settle(report, finding, probe.correct)).toEqual({
      kind: "one-off",
      solved: { problem: probe.problem, answer: probe.correct },
      rules: 2,
    });
  });

  it("any other answer settles nothing", () => {
    expect(settle(report, finding, NONSENSE)).toBeNull();
  });

  it("the right answer names the rule that this problem doesn't trip", () => {
    // 50 − 18 = 48 fits "smaller from larger" and "0 − N = N"; only a problem without a
    // zero on top separates them, and a child with the zero rule gets that one right.
    const zeros = diagnoseSheet(sheet("50-18=48"));
    const tie = interpret(zeros);
    if (tie.kind !== "tie" || !tie.probe) throw new Error("expected a tie with a check problem");
    const spared = tie.probe.expected.find((e) => !e.applies);
    expect(spared?.family).toBe("sub-zero-minus-n");
    const settled = settle(zeros, tie, tie.probe.correct);
    expect(settled?.kind === "pattern" && settled.evidence.family).toBe("sub-zero-minus-n");
  });
});

describe("confirming a rule seen once", () => {
  const report = diagnoseSheet(sheet("52-18=46"));
  const finding = interpret(report);
  if (finding.kind !== "maybe" || !finding.check) throw new Error("expected a lead with a check problem");
  const { check } = finding;

  it("the rule's answer confirms it", () => {
    const settled = settle(report, finding, check.buggy);
    expect(settled?.kind).toBe("pattern");
    if (settled?.kind !== "pattern") return;
    expect(settled.evidence.family).toBe("sub-smaller-from-larger");
    expect(settled.confirmedBy).toEqual({ problem: check.problem, answer: check.buggy });
  });

  it("the right answer makes it a one-off", () => {
    expect(settle(report, finding, check.correct)).toMatchObject({ kind: "one-off", rules: 1 });
  });

  it("any other answer settles nothing, and the next attempt asks a new problem", () => {
    expect(settle(report, finding, NONSENSE)).toBeNull();
    const next = interpret(report, 1);
    expect(next.kind === "maybe" && next.check !== null).toBe(true);
    expect(checkProblem(next)).not.toEqual(check.problem);
  });
});

describe("findings with nothing to check", () => {
  it("are left alone", () => {
    const report = diagnoseSheet(sheet("52-18=46", "63-27=44"));
    const finding = interpret(report);
    expect(finding.kind).toBe("pattern");
    expect(checkProblem(finding)).toBeNull();
    expect(settle(report, finding, 34)).toBeNull();
  });
});

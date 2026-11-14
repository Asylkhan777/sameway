import { describe, expect, it } from "vitest";
import { BUGS, bugById, show, solve } from "@/lib/engine";
import type { Problem } from "@/lib/engine";
import { PRACTICE_SIZE, freshExercise, grade, practiceSet } from "./practice";

const bug = (id: string) => {
  const found = bugById(id);
  if (!found) throw new Error(`no rule ${id}`);
  return found;
};

const SAMPLE_B: Problem = { op: "*", a: 23, b: 45 };
const SAMPLE_A: Problem = { op: "-", a: 52, b: 18 };

describe("practice set", () => {
  it("has three problems on which the rule goes wrong", () => {
    const rule = bug("mul2-no-placeholder-zero");
    const set = practiceSet(rule, SAMPLE_B);
    expect(set).toHaveLength(PRACTICE_SIZE);
    for (const exercise of set) {
      expect(exercise.correct).toBe(solve(exercise.problem));
      expect(rule.run(exercise.problem)).toBe(exercise.buggy);
      expect(exercise.buggy).not.toBe(exercise.correct);
    }
  });

  it("every rule gets a full set for a problem it applies to", () => {
    const likes: Record<string, Problem> = {
      "-": { op: "-", a: 403, b: 158 },
      "+": { op: "+", a: 47, b: 38 },
    };
    for (const rule of BUGS) {
      const like = likes[rule.op] ?? (rule.id.startsWith("mul2") ? SAMPLE_B : { op: "*", a: 27, b: 8 });
      expect(practiceSet(rule, like), rule.id).toHaveLength(PRACTICE_SIZE);
    }
  });

  it("practicing again brings a full set of different problems", () => {
    for (const [id, like] of [
      ["sub-smaller-from-larger", SAMPLE_A],
      ["mul2-no-placeholder-zero", SAMPLE_B],
    ] as const) {
      const rule = bug(id);
      const first = practiceSet(rule, like).map((exercise) => show(exercise.problem));
      for (let round = 1; round <= 4; round++) {
        const again = practiceSet(rule, like, round);
        expect(again, `${id} round ${round}`).toHaveLength(PRACTICE_SIZE);
        expect(again.map((exercise) => show(exercise.problem))).not.toEqual(first);
        for (const exercise of again) expect(rule.run(exercise.problem)).toBe(exercise.buggy);
      }
    }
  });

  it("a fresh problem is never one that was already shown", () => {
    const rule = bug("sub-smaller-from-larger");
    const used = practiceSet(rule, SAMPLE_A).map((exercise) => exercise.problem);
    for (let round = 0; round < 12; round++) {
      const fresh = freshExercise(rule, SAMPLE_A, used);
      if (!fresh) throw new Error(`ran out of problems after ${used.length}`);
      expect(used.map(show)).not.toContain(show(fresh.problem));
      expect(rule.run(fresh.problem)).toBe(fresh.buggy);
      expect(fresh.buggy).not.toBe(fresh.correct);
      used.push(fresh.problem);
    }
  });
});

describe("grading a practice answer", () => {
  const rule = bug("sub-smaller-from-larger");

  it("the right answer is right", () => {
    expect(grade(rule, SAMPLE_A, 34)).toEqual({ kind: "right" });
  });

  it("the rule's own answer is the same rule again", () => {
    const result = grade(rule, SAMPLE_A, 46);
    expect(result.kind === "same-rule" && result.bug.id).toBe("sub-smaller-from-larger");
  });

  it("another variant of the same misconception still counts as the same rule", () => {
    const skips = bug("sub-borrow-skips-zero");
    const stops = bug("sub-borrow-stops-at-zero");
    const problem: Problem = { op: "-", a: 403, b: 158 };
    const answer = stops.run(problem);
    if (answer === null || answer === skips.run(problem)) throw new Error("variants should differ here");
    const result = grade(skips, problem, answer);
    expect(result.kind === "same-rule" && result.bug.id).toBe("sub-borrow-stops-at-zero");
  });

  it("a slip gets the engine's own note, not the rule", () => {
    const result = grade(rule, SAMPLE_A, 33);
    expect(result.kind).toBe("other");
    if (result.kind === "other") expect(result.message.headline).toMatch(/one small slip/);
  });

  it("a different rule is reported as that rule", () => {
    const result = grade(rule, SAMPLE_A, 44);
    expect(result.kind).toBe("other");
    if (result.kind === "other") expect(result.message.headline).toBe("Regroups but never takes the ten away");
  });
});

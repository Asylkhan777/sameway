import type { Bug, Message, Problem } from "@/lib/engine";
import { checkSet, diagnose, toMessage } from "@/lib/engine";
import type { Exercise } from "@/lib/report";

/** Problems in a practice round. Getting all of them right means the rule is fixed. */
export const PRACTICE_SIZE = 3;

/** The practice round for a rule: problems shaped like `like` on which the rule goes wrong. */
export const practiceSet = (bug: Bug, like: Problem): Exercise[] => checkSet(bug, like, PRACTICE_SIZE);

const same = (x: Problem, y: Problem): boolean => x.op === y.op && x.a === y.a && x.b === y.b;

/** A new problem of the same kind that hasn't been shown yet, for retrying after a wrong answer. */
export function freshExercise(bug: Bug, like: Problem, used: Problem[]): Exercise | null {
  // checkSet's default seed is 7; later seeds draw from a different pool of problems.
  for (let salt = 7; salt < 12; salt++) {
    const fresh = checkSet(bug, like, used.length + 1, salt).find(
      (exercise) => !used.some((problem) => same(problem, exercise.problem)),
    );
    if (fresh) return fresh;
  }
  return null;
}

export type Grade =
  | { kind: "right" }
  /** The answer the rule being practiced gives: it is still there. */
  | { kind: "same-rule"; bug: Bug }
  /** Wrong for another reason (a slip, a different rule, or nothing we recognize). */
  | { kind: "other"; message: Message };

/** Grade one practice answer. The engine decides; this only sorts its diagnosis three ways. */
export function grade(bug: Bug, problem: Problem, answer: number): Grade {
  const diagnosis = diagnose(problem, answer);
  if (diagnosis.kind === "correct") return { kind: "right" };
  if (diagnosis.kind === "bug") {
    const again =
      diagnosis.matches.find((match) => match.id === bug.id) ??
      diagnosis.matches.find((match) => match.family === bug.family);
    if (again) return { kind: "same-rule", bug: again };
  }
  return { kind: "other", message: toMessage(problem, diagnosis) };
}

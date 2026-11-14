export type Op = "+" | "-" | "*";

export interface Problem {
  op: Op;
  a: number;
  b: number;
}

/**
 * What the UI draws to show the fix.
 * - place-value: base-ten blocks; `columns` are the places to highlight (0 = ones).
 * - area: area model; `rows` are the expanded parts of a (23 → [20, 3]), `cols` the parts of b,
 *   `highlight` lists [row, col] cells.
 */
export type Visual =
  | { kind: "place-value"; columns: number[] }
  | { kind: "area"; rows: number[]; cols: number[]; highlight: [number, number][] };

/**
 * One broken rule a child can follow, e.g. "subtract the smaller digit from the bigger one".
 * Each rule is a deterministic function: given a problem, it returns the exact wrong answer
 * a child following that rule would write.
 */
export interface Bug {
  id: string;
  /** Variants of one misconception share a family. A family is one thing to teach. */
  family: string;
  op: Op;
  /** Parent-facing name of the rule. */
  title: string;
  /** The answer a child following this rule writes, or null if the rule doesn't fit the problem. */
  run(p: Problem): number | null;
  /** What went wrong on this exact problem, for the parent. */
  explain(p: Problem): string;
  /** A question the parent can ask, in the classroom's words. */
  say(p: Problem): string;
  visual(p: Problem): Visual;
}

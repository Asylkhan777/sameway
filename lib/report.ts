import type { Bug, Evidence, Probe, Problem, SheetReport } from "@/lib/engine";
import { checkSet, findProbe } from "@/lib/engine";

/** A worksheet answer that shows a rule in action: the problem, what the child wrote, the rule. */
export interface Example {
  problem: Problem;
  answer: number;
  bug: Bug;
}

/** A practice or check problem: its right answer, and the answer the rule would give. */
export type Exercise = ReturnType<typeof checkSet>[number];

/** A problem together with the answer the child wrote for it. */
export interface Solved {
  problem: Problem;
  answer: number;
}

/**
 * What the result screen says about a worksheet. This only regroups the engine's report
 * for display; every number, rule and check problem still comes from the engine.
 */
export type Finding =
  | { kind: "all-correct" }
  /** One rule explains two or more wrong answers, or a check problem confirmed it (`confirmedBy`). */
  | { kind: "pattern"; evidence: Evidence; example: Example; confirmedBy?: Solved }
  /** Two or more rules fit equally well; `probe` is the one problem that tells them apart. */
  | { kind: "tie"; candidates: Evidence[]; probe: Probe | null }
  /** A rule fits a single answer; `check` is a problem that would confirm it. */
  | { kind: "maybe"; evidence: Evidence; example: Example; check: Exercise | null }
  /** A check problem came back right: the rule isn't a habit. `rules` is how many were in question. */
  | { kind: "one-off"; solved: Solved; rules: number }
  | { kind: "no-pattern" };

/** The first answer on the sheet that this rule reproduces. */
export function exampleOf(report: SheetReport, evidence: Evidence): Example | null {
  const items = report.items.map((r) => r.item);
  const exact = items.find((item) => evidence.bug.run(item.problem) === item.answer);
  if (exact) return { ...exact, bug: evidence.bug };
  // Another variant of the same misconception matched instead.
  for (const { item, diagnosis } of report.items) {
    if (diagnosis.kind !== "bug") continue;
    const bug = diagnosis.matches.find((m) => m.family === evidence.family);
    if (bug) return { ...item, bug };
  }
  return null;
}

/**
 * `attempt` picks the check problem for a tie or a lead: 0 is the first one, and each
 * inconclusive answer moves on to the next.
 */
export function interpret(report: SheetReport, attempt = 0): Finding {
  const { verdict } = report;
  switch (verdict.kind) {
    case "all-correct":
    case "no-pattern":
      return { kind: verdict.kind };
    case "pattern": {
      const example = exampleOf(report, verdict.evidence);
      return example ? { kind: "pattern", evidence: verdict.evidence, example } : { kind: "no-pattern" };
    }
    case "tie":
      return tie(report, verdict.candidates, attempt);
    case "maybe": {
      // A single answer can fit two rules equally; that is a tie, not a lead.
      const best = verdict.evidence;
      const equal = report.evidence.filter(
        (e) => e.explained === best.explained && e.contradicted === best.contradicted,
      );
      if (equal.length > 1) return tie(report, equal, attempt);
      const example = exampleOf(report, best);
      if (!example) return { kind: "no-pattern" };
      const check = checkSet(example.bug, example.problem, attempt + 1)[attempt] ?? null;
      return { kind: "maybe", evidence: best, example, check };
    }
  }
}

function tie(report: SheetReport, candidates: Evidence[], attempt: number): Finding {
  const like = candidates.map((c) => exampleOf(report, c)).find((e) => e !== null);
  const probe = like
    ? findProbe(
        candidates.map((c) => c.family),
        like.problem,
        1 + attempt,
      )
    : null;
  return { kind: "tie", candidates, probe };
}

const COUNT_WORDS = ["no", "one", "two", "three", "four"];
const countWord = (n: number): string => COUNT_WORDS[n] ?? String(n);

/** One line for the top of the result: "5 of 6 wrong · one rule explains all 5". */
export function summarize(report: SheetReport, finding: Finding = interpret(report)): string {
  const checked = report.items.filter((r) => r.diagnosis.kind !== "unsupported").length;
  if (finding.kind === "all-correct") {
    return checked === 1 ? "1 of 1 correct" : `All ${checked} correct`;
  }
  const wrong = `${report.wrong} of ${checked} wrong`;
  switch (finding.kind) {
    case "pattern": {
      const { explained } = finding.evidence;
      const share =
        explained < report.wrong
          ? `${explained} of them`
          : explained === 1
            ? "it"
            : explained === 2
              ? "both"
              : `all ${explained}`;
      return `${wrong} · one rule explains ${share}`;
    }
    case "tie":
      return `${wrong} · ${countWord(finding.candidates.length)} rules fit equally`;
    case "maybe":
      return `${wrong} · one possible rule`;
    case "one-off":
    case "no-pattern":
      return `${wrong} · no repeating rule`;
  }
}

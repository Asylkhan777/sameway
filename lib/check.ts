import type { Problem, SheetReport } from "@/lib/engine";
import { diagnose } from "@/lib/engine";
import type { Finding, Solved } from "@/lib/report";
import { exampleOf } from "@/lib/report";

/** The one problem the parent is asked to try: to split a tie, or to confirm a rule seen once. */
export function checkProblem(finding: Finding): Problem | null {
  if (finding.kind === "tie") return finding.probe?.problem ?? null;
  if (finding.kind === "maybe") return finding.check?.problem ?? null;
  return null;
}

/**
 * Read the child's answer to the check problem. Returns what the worksheet shows now:
 * the confirmed rule, or a one-off. Returns null when the answer settles nothing
 * (it is wrong, but not the way any candidate rule predicts).
 */
export function settle(report: SheetReport, finding: Finding, answer: number): Finding | null {
  if (finding.kind === "tie") {
    const { probe, candidates } = finding;
    if (!probe) return null;
    const solved: Solved = { problem: probe.problem, answer };
    // Every family predicts its own answers. A rule this problem doesn't trip predicts the
    // right answer, so a correct answer can point at that rule too.
    const predicted = probe.expected.find((e) => e.answers.includes(answer));
    const evidence = predicted && candidates.find((c) => c.family === predicted.family);
    if (evidence) {
      const example = exampleOf(report, evidence);
      return example ? { kind: "pattern", evidence, example, confirmedBy: solved } : null;
    }
    return answer === probe.correct ? { kind: "one-off", solved, rules: candidates.length } : null;
  }

  if (finding.kind === "maybe") {
    const { check, evidence, example } = finding;
    if (!check) return null;
    const solved: Solved = { problem: check.problem, answer };
    if (answer === check.correct) return { kind: "one-off", solved, rules: 1 };
    // Any variant of the same misconception counts: it is one thing to teach.
    const diagnosis = diagnose(check.problem, answer);
    const sameRule = diagnosis.kind === "bug" && diagnosis.families.includes(evidence.family);
    return sameRule ? { kind: "pattern", evidence, example, confirmedBy: solved } : null;
  }

  return null;
}

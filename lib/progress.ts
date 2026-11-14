import type { Bug, Op, Problem } from "@/lib/engine";
import { bugAnswers, bugById, diagnose } from "@/lib/engine";
import type { Finding } from "@/lib/report";
import type { PracticeRecord, Progress, RuleRecord, RuleStatus, WorksheetRecord } from "@/lib/storage";

/**
 * How progress changes. These are pure functions over the stored shape (lib/storage.ts):
 * the app and the demo both go through them, so a rule's status is always derived from
 * worksheets and practice rounds, never set by hand.
 */

/** ISO timestamps sort as text. */
const byTime = (x: { at: string }, y: { at: string }): number => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0);

/** What is saved about a diagnosis: its kind, and the rule if one was named. */
export const verdictOf = (finding: Finding): WorksheetRecord["verdict"] =>
  finding.kind === "pattern"
    ? { kind: "pattern", family: finding.evidence.family, bugId: finding.example.bug.id }
    : { kind: finding.kind };

const sightings = (worksheets: WorksheetRecord[], family: string): WorksheetRecord[] =>
  worksheets.filter((sheet) => sheet.verdict.kind === "pattern" && sheet.verdict.family === family);

/** A round fixes the rule when every problem in it was answered right. */
export const isFixedBy = (results: boolean[]): boolean => results.length > 0 && results.every(Boolean);

/**
 * Replay every rule's history in time order:
 * seen on a worksheet → found; a practice round → practicing, or fixed if all right;
 * seen again after it was fixed → practicing, marked "came back".
 */
export function deriveRules(
  worksheets: WorksheetRecord[],
  previous: Record<string, RuleRecord>,
): Record<string, RuleRecord> {
  const families = new Set(
    worksheets.flatMap((sheet) => (sheet.verdict.kind === "pattern" && sheet.verdict.family ? [sheet.verdict.family] : [])),
  );
  const rules: Record<string, RuleRecord> = {};
  for (const family of families) {
    const seen = sightings(worksheets, family);
    const practice = previous[family]?.practice ?? [];
    const events = [
      ...seen.map((sheet) => ({ at: sheet.at, results: null })),
      ...practice.map((round) => ({ at: round.at, results: round.results })),
    ].sort(byTime);

    let status: RuleStatus = "found";
    let cameBack = false;
    for (const event of events) {
      if (event.results) {
        status = isFixedBy(event.results) ? "fixed" : "practicing";
        if (status === "fixed") cameBack = false;
      } else if (status === "fixed") {
        status = "practicing";
        cameBack = true;
      }
    }

    const last = seen[seen.length - 1];
    rules[family] = {
      title: (last.verdict.bugId && bugById(last.verdict.bugId)?.title) || previous[family]?.title || family,
      firstSeen: seen[0].at,
      lastSeen: last.at,
      seenOn: seen.length,
      status,
      ...(cameBack && { cameBack }),
      practice,
    };
  }
  return rules;
}

/**
 * Save a checked worksheet. Checking the same worksheet again (after editing an answer, or
 * once a check problem settles it) replaces its record instead of adding another.
 */
export function recordWorksheet(progress: Progress, sheet: WorksheetRecord): Progress {
  const known = progress.worksheets.find((w) => w.id === sheet.id);
  const worksheets = known
    ? progress.worksheets.map((w) => (w.id === sheet.id ? { ...sheet, at: w.at } : w))
    : [...progress.worksheets, sheet].sort(byTime);
  return {
    ...progress,
    worksheets,
    rules: deriveRules(worksheets, progress.rules),
    ownWorksheetsUsed: progress.ownWorksheetsUsed + (!known && sheet.source !== "sample" ? 1 : 0),
  };
}

/** Save a practice round for a rule. A round is saved after every answer; the same `at` replaces it. */
export function recordPractice(progress: Progress, family: string, round: PracticeRecord): Progress {
  const rule = progress.rules[family];
  if (!rule) return progress;
  const practice = [...rule.practice.filter((p) => p.at !== round.at), round].sort(byTime);
  return {
    ...progress,
    rules: deriveRules(progress.worksheets, { ...progress.rules, [family]: { ...rule, practice } }),
  };
}

export function setChildName(progress: Progress, name: string): Progress {
  const trimmed = name.trim().slice(0, 40);
  return { ...progress, child: trimmed ? { name: trimmed } : {} };
}

/**
 * What to practice for a rule: the rule itself and the child's own problem it showed up on,
 * read back from the most recent worksheet that had it.
 */
export function practiceTarget(worksheets: WorksheetRecord[], family: string): { bug: Bug; like: Problem } | null {
  for (const sheet of sightings(worksheets, family).reverse()) {
    const find = (wanted: (bug: Bug) => boolean) => {
      for (const { problem, answer } of sheet.items) {
        const diagnosis = diagnose(problem, answer);
        const bug = diagnosis.kind === "bug" ? diagnosis.matches.find(wanted) : undefined;
        if (bug) return { bug, like: problem };
      }
      return null;
    };
    const target = find((bug) => bug.id === sheet.verdict.bugId) ?? find((bug) => bug.family === family);
    if (target) return target;
  }
  return null;
}

/**
 * Worksheets since the rule was fixed that could have tripped it and didn't: problems where
 * the rule gives a different answer, and none of the child's answers is that answer.
 */
export function recheckedSinceFixed(worksheets: WorksheetRecord[], family: string, rule: RuleRecord): number {
  const fixedAt = rule.practice[rule.practice.length - 1]?.at;
  if (rule.status !== "fixed" || !fixedAt) return 0;
  return worksheets.filter((sheet) => {
    if (sheet.at <= fixedAt) return false;
    const outcomes = sheet.items.flatMap(({ problem, answer }) =>
      bugAnswers(problem)
        .filter((x) => x.bug.family === family)
        .map((x) => x.answer === answer),
    );
    return outcomes.length > 0 && !outcomes.includes(true);
  }).length;
}

const OP_NAME: Record<Op, string> = { "+": "addition", "-": "subtraction", "*": "multiplication" };

const OUTCOME: Record<WorksheetRecord["verdict"]["kind"], string> = {
  "all-correct": "all correct",
  pattern: "rule found",
  tie: "two rules fit, not settled yet",
  maybe: "one possible rule, not confirmed",
  "one-off": "a one-off, nothing to fix",
  "no-pattern": "no repeating rule",
};

/** One line for the timeline: "6 subtraction problems · 5 wrong · rule found". */
export function worksheetSummary(sheet: WorksheetRecord): string {
  const count = sheet.items.length;
  const ops = new Set(sheet.items.map((item) => item.problem.op));
  const kind = ops.size === 1 ? `${OP_NAME[sheet.items[0].problem.op]} ` : "";
  const what = `${count} ${kind}${count === 1 ? "problem" : "problems"}`;
  const wrong = sheet.items.filter(({ problem, answer }) => {
    const diagnosis = diagnose(problem, answer);
    return diagnosis.kind !== "correct" && diagnosis.kind !== "unsupported";
  }).length;
  return wrong === 0 ? `${what} · all correct` : `${what} · ${wrong} wrong · ${OUTCOME[sheet.verdict.kind]}`;
}

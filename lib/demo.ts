import type { SheetItem } from "@/lib/engine";
import { diagnoseSheet } from "@/lib/engine";
import type { Entry } from "@/lib/parse";
import { grade, practiceSet } from "@/lib/practice";
import { practiceTarget, recordPractice, recordWorksheet, verdictOf } from "@/lib/progress";
import { interpret } from "@/lib/report";
import { sampleById } from "@/lib/samples";
import type { Progress, WorksheetRecord } from "@/lib/storage";
import { EMPTY_PROGRESS } from "@/lib/storage";

/**
 * The demo profile "3 weeks with Maya". Only inputs are stored here: the worksheets Maya
 * brought home and the answers she gave in practice. Every verdict, practice score and rule
 * status is computed by replaying those inputs through the engine and lib/progress.ts,
 * exactly as the app does for a real family.
 */

export const DEMO_CHILD = "Maya";

type Step =
  | { day: number; sheet: Entry[]; source: WorksheetRecord["source"] }
  /** What Maya wrote for each problem of that day's practice round on a rule. */
  | { day: number; practice: string; answers: number[] };

const sample = (id: string): Entry[] => sampleById(id)?.entries ?? [];

const ADDITION_SHEET: Entry[] = [
  { op: "+", a: 47, b: 38, answer: 85 },
  { op: "+", a: 56, b: 27, answer: 83 },
  { op: "+", a: 68, b: 17, answer: 85 },
  { op: "+", a: 29, b: 46, answer: 75 },
];

/**
 * Days are counted back from today. Maya's worksheets are the three sample sheets plus one
 * clean addition sheet; the page that shows them carries a DEMO banner.
 */
const SCRIPT: Step[] = [
  { day: -20, sheet: sample("a"), source: "photo" },
  // 31 − 23, 71 − 58, 62 − 54: the old rule twice, right once.
  { day: -20, practice: "sub-smaller-from-larger", answers: [12, 13, 12] },
  // 72 − 54, 91 − 52, 83 − 68: all right.
  { day: -18, practice: "sub-smaller-from-larger", answers: [18, 39, 15] },
  { day: -13, sheet: ADDITION_SHEET, source: "typed" },
  { day: -6, sheet: sample("c"), source: "photo" },
  // 705 − 618, 900 − 524, 601 − 583: the old rule on the middle one.
  { day: -6, practice: "sub-across-zero", answers: [87, 386, 18] },
  { day: -1, sheet: sample("b"), source: "photo" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Build Maya's progress as of `now`. Each step lands a few minutes after the one before it. */
export function buildDemo(now: number = Date.now()): Progress {
  let progress: Progress = { ...EMPTY_PROGRESS, child: { name: DEMO_CHILD } };
  SCRIPT.forEach((step, index) => {
    const at = new Date(now + step.day * DAY_MS + index * 10 * MINUTE_MS).toISOString();
    if ("sheet" in step) {
      const items: SheetItem[] = step.sheet.flatMap((e) =>
        e.answer === null ? [] : [{ problem: { op: e.op, a: e.a, b: e.b }, answer: e.answer }],
      );
      const verdict = verdictOf(interpret(diagnoseSheet(items)));
      progress = recordWorksheet(progress, { id: `demo-${index}`, at, source: step.source, items, verdict });
      return;
    }
    const target = practiceTarget(progress.worksheets, step.practice);
    if (!target) return;
    const round = progress.rules[step.practice]?.practice.length ?? 0;
    const results = practiceSet(target.bug, target.like, round).map(
      (exercise, i) => grade(target.bug, exercise.problem, step.answers[i]).kind === "right",
    );
    progress = recordPractice(progress, step.practice, { at, results });
  });
  return progress;
}
